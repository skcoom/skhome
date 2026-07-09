import type { MatcherResult, SiteRecord } from "../types";
import {
  extractSiteName,
  extractUnit,
  normalizeSiteText,
  type AliasCluster,
  type AliasDictionary,
} from "./normalization";

export interface MatcherInput {
  sender: string;
  text: string | null;
  images: number;
  image_desc?: string;
  sender_context?: Array<{ site: string; when?: string }>;
  group_context?: unknown[];
}

function result(overrides: Partial<MatcherResult>): MatcherResult {
  return {
    action: "ask",
    candidates: [],
    phase: "unknown",
    confidence: 0.4,
    reasoning: "確信が持てないため確認する",
    ...overrides,
  };
}

function phaseFromText(text: string): MatcherResult["phase"] {
  if (/完了|完工|仕上がり|清掃済/u.test(text)) return "after";
  if (/施工前|着工前/u.test(text)) return "before";
  if (/着工|施工中|養生|下地|パテ/u.test(text)) return "during";
  return "unknown";
}

function isNonWork(input: MatcherInput): boolean {
  const text = input.text ?? "";
  const imageDescription = input.image_desc ?? "";
  if (/新年会|忘年会|宴会/u.test(text)) return true;
  if (/料理|食事|定食|ラーメン|人物中心|宴会/u.test(imageDescription)) return true;
  if (input.images > 0) return false;
  if (/病院|通院|休み|休暇|体調|予約/u.test(text)) return true;
  if (/[@＠]|\?|？|ですか|どんな感じ/u.test(text)) return true;
  return !/完了|完工|着工|施工|養生|工程|工事/u.test(text);
}

function exactSiteMatches(text: string, sites: SiteRecord[]): SiteRecord[] {
  const normalizedText = normalizeSiteText(text);
  return sites.filter((site) => {
    const normalizedSite = normalizeSiteText(site.name);
    return normalizedSite.length >= 3 && normalizedText.includes(normalizedSite);
  });
}

function findCluster(text: string, dictionary: AliasDictionary): AliasCluster | undefined {
  const normalizedText = normalizeSiteText(text);
  return dictionary.clusters.find((cluster) =>
    [cluster.canonical, ...cluster.aliases]
      .some((alias) => normalizedText.includes(normalizeSiteText(alias))),
  );
}

function clusterSites(cluster: AliasCluster, sites: SiteRecord[]): SiteRecord[] {
  const names = [cluster.canonical, ...cluster.aliases].map(normalizeSiteText);
  return sites.filter((site) => {
    const normalizedSite = normalizeSiteText(site.name);
    return names.some((name) => normalizedSite.includes(name) || name.includes(normalizedSite));
  });
}

function ids(sites: SiteRecord[]): string[] {
  return sites.slice(0, 3).map((site) => site.id);
}

export function matchDeterministically(
  input: MatcherInput,
  sites: SiteRecord[],
  dictionary: AliasDictionary,
): MatcherResult {
  const text = input.text?.trim() ?? "";
  if (isNonWork(input)) {
    return result({ action: "ignore", confidence: 0.99, reasoning: "現場記録ではない投稿" });
  }

  if (!text) {
    const recent = input.sender_context?.[0];
    if (!recent) {
      return result({ action: "ask", candidates: ids(sites), confidence: 0.3 });
    }
    const site = sites.find((candidate) => candidate.name === recent.site);
    const hours = Number(recent.when?.match(/(\d+)時間/u)?.[1] ?? "99");
    if (site && hours <= 24) {
      return result({
        action: "assign",
        site_id: site.id,
        site_name: site.name,
        confidence: 0.9,
        reasoning: "送信者本人の24時間以内の確定現場",
      });
    }
    return result({
      action: "ask",
      candidates: site ? [site.id] : [],
      confidence: 0.7,
      reasoning: "48時間内の文脈はあるが1日以上空いている",
    });
  }

  const exact = exactSiteMatches(text, sites);
  if (exact.length === 1) {
    const site = exact[0];
    if (!site) return result({});
    return result({
      action: "assign",
      site_id: site.id,
      site_name: site.name,
      phase: phaseFromText(text),
      confidence: 0.98,
      reasoning: "正式現場名の完全一致",
    });
  }

  const cluster = findCluster(text, dictionary);
  if (cluster) {
    const candidates = clusterSites(cluster, sites);
    const inputUnit = extractUnit(text);
    const sameUnit = inputUnit
      ? candidates.filter((site) => extractUnit(site.name) === inputUnit)
      : candidates;

    if (cluster.type === "caution" || cluster.type === "client") {
      if (sameUnit.length === 1 && normalizeSiteText(text) === normalizeSiteText(sameUnit[0]?.name ?? "")) {
        const site = sameUnit[0];
        if (site) {
          return result({
            action: "assign",
            site_id: site.id,
            site_name: site.name,
            phase: phaseFromText(text),
            confidence: 0.96,
            reasoning: "取引先名に場所を併記した正式現場名の一致",
          });
        }
      }
      return result({
        action: "ask",
        candidates: ids(candidates),
        confidence: 0.7,
        reasoning: "要注意クラスタまたは取引先名のため確認する",
      });
    }

    if (
      candidates.length > 1
      && sameUnit.length === 1
      && candidates.some((site) => extractUnit(site.name) === null)
    ) {
      return result({
        action: "ask",
        candidates: ids(candidates),
        confidence: 0.7,
        reasoning: "同一物件内で工事内容の異なる現場が並走している",
      });
    }

    if (sameUnit.length === 1) {
      const site = sameUnit[0];
      if (!site) return result({});
      const usedCanonical = normalizeSiteText(text).includes(normalizeSiteText(cluster.canonical));
      if (!usedCanonical && cluster.note?.includes("同一現場の表記ゆれ")) {
        return result({
          action: "ask_similar",
          candidates: [site.id],
          site_id: site.id,
          site_name: site.name,
          confidence: 0.8,
          reasoning: "既存現場と類似する別表記のため確認する",
        });
      }
      return result({
        action: "assign",
        site_id: site.id,
        site_name: site.name,
        phase: phaseFromText(text),
        confidence: 0.95,
        reasoning: "エイリアスと部屋番号が一致",
      });
    }

    if (inputUnit && candidates.length > 0 && sameUnit.length === 0) {
      const newSiteName = extractSiteName(text);
      return result({
        action: "create",
        new_site_name: newSiteName,
        phase: phaseFromText(text),
        confidence: 0.95,
        reasoning: "同一物件の既存現場と部屋番号が異なる",
      });
    }

    if (candidates.length > 0) {
      return result({ action: "ask", candidates: ids(candidates), confidence: 0.7 });
    }
  }

  const newSiteName = extractSiteName(text);
  if (newSiteName.length >= 2) {
    return result({
      action: "create",
      new_site_name: newSiteName,
      phase: phaseFromText(text),
      confidence: 0.9,
      reasoning: "既存現場に一致しない具体的な現場名",
    });
  }
  return result({ action: "ask", candidates: ids(sites), confidence: 0.4 });
}
