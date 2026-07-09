import aliases from "../../data/site-aliases.json" with { type: "json" };
import type { MatchContext, MatcherResult } from "../types";
import { matchDeterministically } from "./deterministic-matcher";
import { normalizeSiteText, type AliasCluster, type AliasDictionary } from "./normalization";

function dictionaryForContext(context: MatchContext): AliasDictionary {
  const learnedBySite = new Map<string, string[]>();
  for (const alias of context.aliases) {
    learnedBySite.set(alias.site_id, [...(learnedBySite.get(alias.site_id) ?? []), alias.alias]);
  }
  const learnedClusters: AliasCluster[] = context.sites.flatMap((site) => {
    const learned = learnedBySite.get(site.id);
    return learned?.length
      ? [{ canonical: site.name, aliases: [...new Set(learned)], type: "property" as const }]
      : [];
  });
  return {
    ...(aliases as AliasDictionary),
    clusters: [...learnedClusters, ...(aliases as AliasDictionary).clusters],
  };
}

function askForConflict(
  ai: MatcherResult,
  deterministic: MatcherResult,
  reasoning: string,
): MatcherResult {
  const candidates = [...new Set([
    deterministic.site_id,
    ...deterministic.candidates,
    ai.site_id,
    ...ai.candidates,
  ].filter((id): id is string => Boolean(id)))].slice(0, 3);
  const result: MatcherResult = {
    action: "ask",
    candidates,
    phase: ai.phase,
    confidence: Math.min(ai.confidence, 0.84),
    reasoning,
  };
  if (deterministic.new_site_name) result.new_site_name = deterministic.new_site_name;
  return result;
}

export function applyConservativeGuard(context: MatchContext, ai: MatcherResult): MatcherResult {
  const deterministic = matchDeterministically(
    {
      sender: context.event.sender,
      text: context.event.text,
      images: context.event.images,
      ...(context.event.image_description ? { image_desc: context.event.image_description } : {}),
      sender_context: context.sender_context.map((item) => ({ site: item.site, when: item.when })),
      group_context: context.group_context,
    },
    context.sites,
    dictionaryForContext(context),
  );
  if (deterministic.action === "ignore") return deterministic;
  if (deterministic.action === "ask" || deterministic.action === "ask_similar") return deterministic;
  if (ai.action === "assign" && deterministic.action === "assign" && deterministic.site_id !== ai.site_id) {
    return askForConflict(ai, deterministic, "AI判定と正規化照合が一致しないため確認する");
  }
  if (ai.action === "assign" && deterministic.action === "create") {
    return askForConflict(ai, deterministic, "部屋番号違いまたは新規現場候補のため確認する");
  }
  if (deterministic.action === "assign" && ai.action === "ignore") {
    return askForConflict(ai, deterministic, "現場名照合とignore判定が競合したため確認する");
  }
  if (ai.action === "create" && deterministic.action === "assign") {
    const guarded: MatcherResult = {
      action: "ask_similar",
      candidates: deterministic.site_id ? [deterministic.site_id] : [],
      phase: ai.phase,
      confidence: Math.min(ai.confidence, 0.84),
      reasoning: "既存現場との類似があるため統合可否を確認する",
    };
    if (deterministic.site_id) guarded.site_id = deterministic.site_id;
    if (deterministic.site_name) guarded.site_name = deterministic.site_name;
    if (ai.new_site_name) guarded.new_site_name = ai.new_site_name;
    return guarded;
  }
  if (
    ai.action === "create"
    && deterministic.action === "create"
    && ai.new_site_name
    && deterministic.new_site_name
    && normalizeSiteText(ai.new_site_name) !== normalizeSiteText(deterministic.new_site_name)
  ) {
    return askForConflict(ai, deterministic, "新規現場名の抽出結果が一致しないため確認する");
  }
  return ai;
}
