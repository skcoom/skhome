import { extractSiteName } from "../engine/normalization";

export function explicitCorrectionTarget(text: string): string | null {
  const match = text.normalize("NFKC").trim().match(/^訂正\s+(.+)$/u);
  const target = match?.[1]?.trim();
  return target && target.length >= 2 && target.length <= 60 ? target : null;
}

export function isAffirmativeAnswer(text: string): boolean {
  return /^はい$/u.test(text.normalize("NFKC").trim());
}

export function isNegativeAnswer(text: string): boolean {
  return /^(?:いいえ|キャンセル)$/u.test(text.normalize("NFKC").trim());
}

function possibleSiteName(text: string): string | null {
  const value = text.normalize("NFKC").trim();
  if (value.length < 2 || value.length > 60) return null;
  if (isAffirmativeAnswer(value) || isNegativeAnswer(value)) return null;
  if (/お疲れ|ありがとう|了解|よろしく|ですか|でしょうか|[?？!！]/u.test(value)) return null;
  if (/完了しました|始めます|はじめます|お願いします/u.test(value)) return null;
  return value;
}

export function pendingSiteNameAnswer(text: string): string | null {
  const value = possibleSiteName(explicitCorrectionTarget(text) ?? text);
  if (!value) return null;
  const extracted = extractSiteName(value);
  return extracted.length >= 2 && extracted.length <= 60 ? extracted : null;
}

export function bareSiteNameAnswer(text: string): string | null {
  const value = possibleSiteName(text);
  if (!value) return null;
  const extracted = extractSiteName(value);
  return extracted === value ? value : null;
}
