import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import aliases from "../data/site-aliases.json" with { type: "json" };
import { matchWithClaude } from "../src/clients/anthropic";
import { matchDeterministically, type MatcherInput } from "../src/engine/deterministic-matcher";
import { normalizeSiteText, type AliasDictionary } from "../src/engine/normalization";
import { applyConservativeGuard } from "../src/engine/safety-guard";
import type { Env, MatchContext, MatcherResult, SiteRecord } from "../src/types";

interface RegressionCase {
  id: string;
  desc: string;
  input: MatcherInput;
  sender_context?: MatcherInput["sender_context"];
  group_context?: unknown[];
  ledger: string[];
  expected: {
    action: string;
    site?: string;
    existing?: string;
    new_site_name?: string;
    candidates?: string[];
    candidates_max?: number;
    phase?: string;
    confidence_min?: number;
    confidence_max?: number;
  };
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function evaluate(testCase: RegressionCase, actual: MatcherResult): {
  status: "pass" | "safe_ask" | "fail";
  reasons: string[];
  action: string;
  wrongAssign: boolean;
} {
  const reasons: string[] = [];
  if (actual.action !== testCase.expected.action) reasons.push(`action ${actual.action} != ${testCase.expected.action}`);
  if (testCase.expected.site && actual.site_name !== testCase.expected.site) reasons.push(`site ${actual.site_name ?? "-"} != ${testCase.expected.site}`);
  if (testCase.expected.existing && actual.site_name !== testCase.expected.existing) reasons.push(`existing ${actual.site_name ?? "-"} != ${testCase.expected.existing}`);
  if (testCase.expected.new_site_name && actual.new_site_name !== testCase.expected.new_site_name) reasons.push(`new_site_name ${actual.new_site_name ?? "-"} != ${testCase.expected.new_site_name}`);
  if (testCase.expected.phase && actual.phase !== testCase.expected.phase) reasons.push(`phase ${actual.phase} != ${testCase.expected.phase}`);
  if (testCase.expected.confidence_min !== undefined && actual.confidence < testCase.expected.confidence_min) reasons.push(`confidence ${actual.confidence} < ${testCase.expected.confidence_min}`);
  if (testCase.expected.confidence_max !== undefined && actual.confidence > testCase.expected.confidence_max) reasons.push(`confidence ${actual.confidence} > ${testCase.expected.confidence_max}`);
  if (testCase.expected.candidates_max !== undefined && actual.candidates.length > testCase.expected.candidates_max) reasons.push(`candidates ${actual.candidates.length} > ${testCase.expected.candidates_max}`);
  if (testCase.expected.candidates) {
    const missing = testCase.expected.candidates.filter((candidate) => !actual.candidates.includes(candidate));
    if (missing.length > 0) reasons.push(`missing candidates: ${missing.join(", ")}`);
  }
  const wrongAssign = actual.action === "assign"
    && (testCase.expected.action !== "assign" || Boolean(testCase.expected.site && actual.site_name !== testCase.expected.site));
  const safeAsk = (actual.action === "ask" || actual.action === "ask_similar")
    && testCase.expected.action !== "ignore"
    && !wrongAssign;
  return {
    status: reasons.length === 0 ? "pass" : safeAsk ? "safe_ask" : "fail",
    reasons,
    action: actual.action,
    wrongAssign,
  };
}

async function matchLive(testCase: RegressionCase, sites: SiteRecord[]): Promise<MatcherResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required with --live");
  const prompt = await readFile(resolve("prompts/site-matcher.md"), "utf8");
  const model = argument("--model") ?? "claude-haiku-4-5";
  if (model !== "claude-haiku-4-5" && model !== "claude-sonnet-5") {
    throw new Error("--model must be claude-haiku-4-5 or claude-sonnet-5");
  }
  const aliasRows = aliases.clusters.flatMap((cluster) => {
    const clusterNames = [cluster.canonical, ...cluster.aliases].map(normalizeSiteText);
    return sites.flatMap((site) => clusterNames.some((name) => normalizeSiteText(site.name).includes(name))
      ? cluster.aliases.map((alias) => ({ site_id: site.id, site_name: site.name, alias, source: `initial:${cluster.type}` }))
      : []);
  });
  const senderContext = testCase.sender_context ?? testCase.input.sender_context ?? [];
  const context: MatchContext = {
    event: {
      sender: testCase.input.sender,
      text: testCase.input.text,
      images: testCase.input.images,
      ...(testCase.input.image_desc ? { image_description: testCase.input.image_desc } : {}),
    },
    sender_context: senderContext.flatMap((item) => {
      const site = sites.find((candidate) => candidate.name === item.site);
      return site ? [{ site_id: site.id, site: site.name, when: item.when ?? "", text: null }] : [];
    }),
    group_context: (testCase.group_context ?? testCase.input.group_context ?? []).map((item) => {
      const value = item as Record<string, unknown>;
      return {
        sender: typeof value.sender === "string" ? value.sender : "話者不明",
        text: typeof value.text === "string" ? value.text : null,
        site: typeof value.site === "string" ? value.site : null,
        when: typeof value.when === "string" ? value.when : "",
      };
    }),
    sites,
    aliases: aliasRows,
  };
  const env = { ANTHROPIC_API_KEY: apiKey, ANTHROPIC_MODEL: model } as Env;
  return applyConservativeGuard(context, await matchWithClaude(context, [], env, prompt), false);
}

const casesPath = argument("--cases");
if (!casesPath) {
  throw new Error("Usage: npm run test:regression -- --cases /absolute/path/to/cases.jsonl");
}
const content = await readFile(resolve(casesPath), "utf8");
const cases = content.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as RegressionCase);
const live = process.argv.includes("--live");
const details: Array<ReturnType<typeof evaluate> & { id: string; desc: string }> = [];
for (const testCase of cases) {
  const sites: SiteRecord[] = testCase.ledger.map((name) => ({ id: name, name }));
  const input: MatcherInput = {
    ...testCase.input,
    sender_context: testCase.sender_context ?? testCase.input.sender_context ?? [],
    group_context: testCase.group_context ?? testCase.input.group_context ?? [],
  };
  const actual = live
    ? await matchLive(testCase, sites)
    : matchDeterministically(input, sites, aliases as AliasDictionary);
  details.push({ id: testCase.id, desc: testCase.desc, ...evaluate(testCase, actual) });
}
const exactPass = details.filter((item) => item.status === "pass").length;
const safeAsk = details.filter((item) => item.status === "safe_ask").length;
const fail = details.filter((item) => item.status === "fail").length;
const wrongAssign = details.filter((item) => item.wrongAssign).length;
const scored = cases.length - safeAsk;
const summary = {
  total: cases.length,
  exactPass,
  safeAsk,
  fail,
  exactAccuracy: cases.length === 0 ? 0 : exactPass / cases.length,
  safetyAdjustedAccuracy: scored === 0 ? 1 : exactPass / scored,
  wrongAssign,
  mode: live ? "claude-live" : "deterministic-safety-layer",
  passed: cases.length === 20 && (exactPass / Math.max(1, scored)) >= 0.9 && wrongAssign === 0 && fail === 0,
  details,
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (!summary.passed) process.exitCode = 1;
