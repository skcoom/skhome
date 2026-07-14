import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

interface Check {
  id: string;
  ok: boolean;
  detail: string;
}

interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

const workerDir = resolve(import.meta.dirname, "..");
const wranglerPath = resolve(workerDir, "node_modules/.bin/wrangler");
const requiredSecrets = [
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "DISCORD_WEBHOOK_URL",
  "LINE_SUMMARY_USER_ID",
] as const;

function runWrangler(args: string[]): CommandResult {
  const result = spawnSync(wranglerPath, args, {
    cwd: workerDir,
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function tomlString(source: string, key: string): string | null {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"\\s*$`, "mu"));
  return match?.[1] ?? null;
}

function line(ok: boolean, label: string, detail: string): void {
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${label}: ${detail}\n`);
}

async function checkHealth(baseUrl: string): Promise<Check> {
  if (!baseUrl.startsWith("https://")) {
    return { id: "worker_health", ok: false, detail: "PUBLIC_BASE_URL must use https" };
  }
  try {
    const response = await fetch(new URL("/health", baseUrl), {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return { id: "worker_health", ok: false, detail: `GET /health returned ${response.status}` };
    }
    const body = await response.json() as { ok?: unknown; service?: unknown };
    const ok = body.ok === true && body.service === "genba-ai";
    return {
      id: "worker_health",
      ok,
      detail: ok ? `${baseUrl}/health is ready` : "GET /health returned an unexpected body",
    };
  } catch {
    return { id: "worker_health", ok: false, detail: "GET /health could not reach the configured Worker" };
  }
}

const [config, bootstrapConfig] = await Promise.all([
  readFile(resolve(workerDir, "wrangler.toml"), "utf8"),
  readFile(resolve(workerDir, "wrangler.bootstrap.toml"), "utf8"),
]);
const workerName = tomlString(config, "name");
const supabaseUrl = tomlString(config, "SUPABASE_URL");
const publicBaseUrl = tomlString(config, "PUBLIC_BASE_URL");
const model = tomlString(config, "ANTHROPIC_MODEL");
const bucketName = tomlString(config, "bucket_name");
const checks: Check[] = [
  {
    id: "worker_name",
    ok: workerName === "skhome-genba-ai",
    detail: workerName ?? "missing from wrangler.toml",
  },
  {
    id: "workers_dev",
    ok: config.includes("workers_dev = true"),
    detail: "workers.dev route must stay enabled for the configured PUBLIC_BASE_URL",
  },
  {
    id: "bootstrap_fail_closed",
    ok: bootstrapConfig.includes('main = "src/bootstrap.ts"')
      && bootstrapConfig.includes("crons = []")
      && !bootstrapConfig.includes("r2_buckets")
      && !bootstrapConfig.includes("SUPABASE_URL"),
    detail: "bootstrap Worker has no Cron, R2, Supabase, or external API binding",
  },
  {
    id: "supabase_url",
    ok: supabaseUrl === "https://zaykqdsgjbjwudbnlmdc.supabase.co",
    detail: supabaseUrl ?? "missing from wrangler.toml",
  },
  {
    id: "public_base_url",
    ok: publicBaseUrl === "https://skhome-genba-ai.suetake6183.workers.dev",
    detail: publicBaseUrl ?? "missing from wrangler.toml",
  },
  {
    id: "anthropic_model",
    ok: model === "claude-haiku-4-5" || model === "claude-sonnet-5",
    detail: model ?? "missing from wrangler.toml",
  },
  {
    id: "r2_binding",
    ok: bucketName === "skhome-genba-ai-photos",
    detail: bucketName ?? "missing from wrangler.toml",
  },
  {
    id: "cron",
    ok: config.includes('crons = ["* * * * *", "0 23 * * SUN"]'),
    detail: "recovery every minute; weekly summary Monday 08:00 JST",
  },
];

const whoami = runWrangler(["whoami"]);
checks.push({
  id: "cloudflare_auth",
  ok: whoami.ok,
  detail: whoami.ok ? "Wrangler OAuth is available" : "run npx wrangler login",
});

const buckets = whoami.ok ? runWrangler(["r2", "bucket", "list"]) : { ok: false, stdout: "", stderr: "" };
const remoteBucketNames = [...buckets.stdout.matchAll(/^name:\s+(.+)$/gmu)].map((match) => match[1]?.trim());
checks.push({
  id: "remote_r2_bucket",
  ok: buckets.ok && remoteBucketNames.includes(bucketName ?? ""),
  detail: buckets.ok && remoteBucketNames.includes(bucketName ?? "")
    ? bucketName ?? ""
    : `create ${bucketName ?? "the configured bucket"}; do not reuse sk-genba-media`,
});

const deployments = workerName && whoami.ok
  ? runWrangler(["deployments", "list", "--name", workerName, "--json"])
  : { ok: false, stdout: "", stderr: "" };
let deploymentCount = 0;
if (deployments.ok) {
  try {
    const parsed = JSON.parse(deployments.stdout) as unknown;
    deploymentCount = Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    deploymentCount = 0;
  }
}
checks.push({
  id: "worker_deployment",
  ok: deployments.ok && deploymentCount > 0,
  detail: deployments.ok && deploymentCount > 0
    ? `${deploymentCount} deployment record(s) found`
    : "run npm run bootstrap:deployment before entering secrets",
});

const secretList = workerName && deployments.ok && deploymentCount > 0
  ? runWrangler(["secret", "list", "--name", workerName, "--format", "json"])
  : { ok: false, stdout: "", stderr: "" };
let secretNames: string[] = [];
if (secretList.ok) {
  try {
    const parsed = JSON.parse(secretList.stdout) as Array<{ name?: unknown }>;
    secretNames = parsed.flatMap((item) => typeof item.name === "string" ? [item.name] : []);
  } catch {
    secretNames = [];
  }
}
for (const secret of requiredSecrets) {
  checks.push({
    id: `secret_${secret.toLowerCase()}`,
    ok: secretNames.includes(secret),
    detail: secretNames.includes(secret)
      ? "registered"
      : `npx wrangler secret put ${secret} --config wrangler.bootstrap.toml`,
  });
}

if (publicBaseUrl) checks.push(await checkHealth(publicBaseUrl));

for (const check of checks) line(check.ok, check.id, check.detail);
const failed = checks.filter((check) => !check.ok);
process.stdout.write(`\n${checks.length - failed.length}/${checks.length} preflight checks passed.\n`);
if (failed.length > 0) {
  process.stdout.write("No production settings were changed. Complete the FAIL items, then rerun this command.\n");
  process.exitCode = 1;
}
