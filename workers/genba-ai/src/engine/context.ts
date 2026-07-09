import { SupabaseClient } from "../clients/supabase";
import type { MatchContext, StoredLineEvent } from "../types";

function hoursAgo(iso: string, now: Date): string {
  const hours = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 3_600_000));
  return `${hours}時間前`;
}

export async function buildMatchContext(
  events: StoredLineEvent[],
  db: SupabaseClient,
): Promise<MatchContext> {
  const first = events[0];
  if (!first) throw new Error("Cannot build context for an empty burst");
  const now = new Date(events.at(-1)?.received_at ?? first.received_at);
  const senderSince = new Date(now.getTime() - 48 * 3_600_000).toISOString();
  const groupSince = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const contextUntil = now.toISOString();
  const [sites, aliases, senderRows, groupRows] = await Promise.all([
    db.getActiveSites(),
    db.getAliases(),
    db.getSenderContext(first.sender_id, senderSince, contextUntil),
    db.getGroupContext(first.source_id, groupSince, contextUntil),
  ]);
  const sitesById = new Map(sites.map((site) => [site.id, site]));
  const aliasesWithNames = aliases.map((alias) => {
    const siteName = sitesById.get(alias.site_id)?.name;
    return siteName ? { ...alias, site_name: siteName } : alias;
  });
  return {
    event: {
      sender: first.sender_name ?? first.sender_id ?? "話者不明",
      text: events.map((event) => event.text_content).find((text): text is string => Boolean(text)) ?? null,
      images: events.filter((event) => Boolean(event.r2_key)).length,
    },
    sender_context: senderRows.flatMap((row) => {
      const site = row.site_id ? sitesById.get(row.site_id) : undefined;
      return site ? [{
        site_id: site.id,
        site: site.name,
        when: hoursAgo(row.received_at, now),
        text: row.text_content,
      }] : [];
    }),
    group_context: groupRows.map((row) => ({
      sender: row.sender_name ?? row.sender_id ?? "話者不明",
      text: row.text_content,
      site: row.site_id ? sitesById.get(row.site_id)?.name ?? null : null,
      when: hoursAgo(row.received_at, now),
    })),
    sites,
    aliases: aliasesWithNames,
  };
}
