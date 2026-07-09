import prompt from "../../prompts/site-matcher.md";
import { matchWithClaude } from "../clients/anthropic";
import type { Env, MatchContext, MatcherResult, VisionImage } from "../types";
import { applyConservativeGuard } from "./safety-guard";

export async function classifySite(
  context: MatchContext,
  images: VisionImage[],
  env: Env,
): Promise<MatcherResult> {
  const ai = await matchWithClaude(context, images, env, prompt);
  return applyConservativeGuard(context, ai);
}
