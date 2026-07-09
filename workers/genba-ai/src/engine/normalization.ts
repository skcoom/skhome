export interface AliasCluster {
  canonical: string;
  aliases: string[];
  type: "property" | "client" | "caution";
  note?: string;
}

export interface AliasDictionary {
  clusters: AliasCluster[];
  normalization_rules?: string[];
}

export function stripDatePrefix(value: string): string {
  return value
    .replace(/^\s*\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\s*/u, "")
    .replace(/^\s*\d{8}\s*/u, "")
    .trim();
}

export function normalizeSiteText(value: string): string {
  return stripDatePrefix(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/リホーム/gu, "リフォーム")
    .replace(/(\d+)階/gu, "$1f")
    .replace(/(\d+)号室/gu, "$1")
    .replace(/ⅱ|ii/gu, "2")
    .replace(/[\s\u3000・,，。\.\-_（）()「」『』]/gu, "");
}

export function extractUnit(value: string): string | null {
  const normalized = normalizeSiteText(value);
  const matches = [...normalized.matchAll(/(?:^|[^0-9])(\d{3,4}|\d{1,2}f)(?![0-9])/gu)];
  return matches.at(-1)?.[1] ?? null;
}

export function extractSiteName(value: string): string {
  return stripDatePrefix(value)
    .replace(/(?:はじめます|始めます|着工します|完了しました|完了です|お疲れ様でした)[。！!\s]*$/u, "")
    .trim();
}
