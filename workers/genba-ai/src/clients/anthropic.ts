import type { Env, MatchContext, MatcherAction, MatcherResult, MediaPhase, VisionImage } from "../types";

const actions = new Set<MatcherAction>(["assign", "ask", "ask_similar", "create", "ignore"]);
const phases = new Set<MediaPhase>(["before", "during", "after", "unknown"]);

function parseJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Claude response did not contain JSON");
  return JSON.parse(text.slice(start, end + 1));
}

function validateResult(value: unknown, context: MatchContext): MatcherResult {
  if (!value || typeof value !== "object") throw new Error("Claude result is not an object");
  const candidate = value as Record<string, unknown>;
  const action = candidate.action;
  const phase = candidate.phase;
  const confidence = candidate.confidence;
  if (typeof action !== "string" || !actions.has(action as MatcherAction)) throw new Error("Claude returned an invalid action");
  if (typeof phase !== "string" || !phases.has(phase as MediaPhase)) throw new Error("Claude returned an invalid phase");
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) throw new Error("Claude returned an invalid confidence");
  const validIds = new Set(context.sites.map((site) => site.id));
  const rawCandidates = Array.isArray(candidate.candidates) ? candidate.candidates : [];
  const candidates = rawCandidates.filter((id): id is string => typeof id === "string" && validIds.has(id)).slice(0, 3);
  const siteId = typeof candidate.site_id === "string" && validIds.has(candidate.site_id) ? candidate.site_id : undefined;
  const site = context.sites.find((item) => item.id === siteId);
  const base: MatcherResult = {
    action: action as MatcherAction,
    candidates,
    phase: phase as MediaPhase,
    confidence,
    reasoning: typeof candidate.reasoning === "string" ? candidate.reasoning.slice(0, 500) : "",
  };
  if (siteId) {
    base.site_id = siteId;
    if (site?.name) base.site_name = site.name;
  }
  if (typeof candidate.new_site_name === "string" && candidate.new_site_name.trim()) {
    base.new_site_name = candidate.new_site_name.trim();
  }
  if (base.action === "assign" && (!base.site_id || base.confidence < 0.85)) {
    return { ...base, action: "ask", candidates: base.site_id ? [base.site_id, ...candidates].slice(0, 3) : candidates };
  }
  if (base.action === "create" && (!base.new_site_name || base.confidence < 0.85)) {
    return { ...base, action: "ask", candidates };
  }
  return base;
}

export async function matchWithClaude(
  context: MatchContext,
  images: VisionImage[],
  env: Env,
  systemPrompt: string,
): Promise<MatcherResult> {
  const content: Array<Record<string, unknown>> = images.slice(0, 10).map((image) => ({
    type: "image",
    source: { type: "base64", media_type: image.mediaType, data: image.data },
  }));
  content.push({ type: "text", text: JSON.stringify(context) });
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    throw new Error(`Claude API failed: ${response.status} ${(await response.text()).slice(0, 500)}`);
  }
  const payload = await response.json() as { content?: Array<{ type: string; text?: string }> };
  const text = payload.content?.filter((block) => block.type === "text").map((block) => block.text ?? "").join("\n") ?? "";
  return validateResult(parseJson(text), context);
}
