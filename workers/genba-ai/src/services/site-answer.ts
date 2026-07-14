import { normalizeSiteText } from "../engine/normalization";
import type { AliasRecord, SiteRecord } from "../types";

export type SiteAnswerResolution =
  | { kind: "resolved"; site: SiteRecord }
  | { kind: "ambiguous"; candidates: SiteRecord[] }
  | { kind: "not_found" };

export function resolveSiteAnswer(
  text: string,
  sites: SiteRecord[],
  aliases: AliasRecord[],
): SiteAnswerResolution {
  const normalized = normalizeSiteText(text);
  const direct = sites.filter((candidate) => normalizeSiteText(candidate.name) === normalized);
  if (direct.length === 1 && direct[0]) return { kind: "resolved", site: direct[0] };
  if (direct.length > 1) return { kind: "ambiguous", candidates: direct };

  const aliasSiteIds = new Set(
    aliases
      .filter((candidate) => normalizeSiteText(candidate.alias) === normalized)
      .map((candidate) => candidate.site_id),
  );
  const aliasSites = sites.filter((candidate) => aliasSiteIds.has(candidate.id));
  if (aliasSites.length === 1 && aliasSites[0]) return { kind: "resolved", site: aliasSites[0] };
  if (aliasSites.length > 1) return { kind: "ambiguous", candidates: aliasSites };
  return { kind: "not_found" };
}
