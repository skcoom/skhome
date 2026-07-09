import type {
  AliasRecord,
  BotTemplate,
  Env,
  SiteRecord,
  StoredLineEvent,
  TemplateId,
} from "../types";

type JsonRecord = Record<string, unknown>;

export class SupabaseClient {
  constructor(private readonly env: Env) {}

  async request<T>(
    path: string,
    init: RequestInit = {},
    prefer?: string,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("apikey", this.env.SUPABASE_SERVICE_ROLE_KEY);
    headers.set("Authorization", `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`);
    if (init.body) headers.set("Content-Type", "application/json");
    if (prefer) headers.set("Prefer", prefer);

    const response = await fetch(`${this.env.SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Supabase request failed: ${response.status} ${detail}`);
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  async registerLineEventsBatch(rows: JsonRecord[]): Promise<StoredLineEvent[]> {
    return this.request<StoredLineEvent[]>(
      "rpc/register_line_events_batch",
      { method: "POST", body: JSON.stringify({ p_events: rows }) },
    );
  }

  async updateLineEvents(ids: string[], patch: JsonRecord): Promise<void> {
    if (ids.length === 0) return;
    const encodedIds = ids.map(encodeURIComponent).join(",");
    await this.request<void>(
      `line_events?id=in.(${encodedIds})`,
      { method: "PATCH", body: JSON.stringify(patch) },
      "return=minimal",
    );
  }

  async getBurstEvents(burstId: string): Promise<StoredLineEvent[]> {
    return this.request<StoredLineEvent[]>(
      `line_events?select=*&burst_id=eq.${encodeURIComponent(burstId)}&order=received_at.asc`,
    );
  }

  async claimBurst(burstId: string): Promise<boolean> {
    return this.request<boolean>(
      "rpc/claim_line_burst",
      { method: "POST", body: JSON.stringify({ p_burst_id: burstId }) },
    );
  }

  async findRecentBurst(
    sourceId: string,
    senderId: string | null,
    since: string,
    until: string,
  ): Promise<StoredLineEvent | null> {
    if (!senderId) return null;
    const rows = await this.request<StoredLineEvent[]>(
      `line_events?select=*&source_id=eq.${encodeURIComponent(sourceId)}&sender_id=eq.${encodeURIComponent(senderId)}&event_type=eq.message%3Aimage&received_at=gte.${encodeURIComponent(since)}&received_at=lte.${encodeURIComponent(until)}&order=received_at.desc&limit=1`,
    );
    return rows[0] ?? null;
  }

  async getActiveSites(): Promise<SiteRecord[]> {
    return this.request<SiteRecord[]>(
      "projects?select=id,name,status,genba_page_token,last_line_activity_at&status=in.(planning,in_progress)&order=updated_at.desc",
    );
  }

  async getAliases(): Promise<AliasRecord[]> {
    const rows = await this.request<AliasRecord[]>("site_aliases?select=site_id,alias,source");
    return rows;
  }

  async getSenderContext(senderId: string | null, since: string, until: string): Promise<StoredLineEvent[]> {
    if (!senderId) return [];
    return this.request<StoredLineEvent[]>(
      `line_events?select=*&sender_id=eq.${encodeURIComponent(senderId)}&site_id=not.is.null&state=eq.recorded&received_at=gte.${encodeURIComponent(since)}&received_at=lte.${encodeURIComponent(until)}&order=received_at.desc&limit=20`,
    );
  }

  async getGroupContext(sourceId: string, since: string, until: string): Promise<StoredLineEvent[]> {
    return this.request<StoredLineEvent[]>(
      `line_events?select=*&source_id=eq.${encodeURIComponent(sourceId)}&received_at=gte.${encodeURIComponent(since)}&received_at=lte.${encodeURIComponent(until)}&order=received_at.desc&limit=50`,
    );
  }

  async recordLineBurst(args: {
    burstId: string;
    siteId: string | null;
    action: "assign" | "create";
    phase: "before" | "during" | "after" | "unknown";
    confidence: number;
    newSiteName: string | null;
  }): Promise<string> {
    return this.request<string>(
      "rpc/record_line_burst",
      {
        method: "POST",
        body: JSON.stringify({
          p_burst_id: args.burstId,
          p_site_id: args.siteId,
          p_action: args.action,
          p_phase: args.phase,
          p_confidence: args.confidence,
          p_new_site_name: args.newSiteName,
        }),
      },
    );
  }

  async recordLineText(args: {
    eventId: string;
    siteId: string | null;
    action: "assign" | "create";
    phase: "before" | "during" | "after" | "unknown";
    confidence: number;
    newSiteName: string | null;
    description: string;
  }): Promise<string> {
    return this.request<string>(
      "rpc/record_line_text",
      {
        method: "POST",
        body: JSON.stringify({
          p_event_id: args.eventId,
          p_site_id: args.siteId,
          p_action: args.action,
          p_phase: args.phase,
          p_confidence: args.confidence,
          p_new_site_name: args.newSiteName,
          p_description: args.description,
        }),
      },
    );
  }

  async getApprovedTemplate(templateId: TemplateId): Promise<BotTemplate | null> {
    const rows = await this.request<BotTemplate[]>(
      `bot_templates?select=template_id,body,variables,approved_at,approved_by&template_id=eq.${templateId}&approved_at=not.is.null&limit=1`,
    );
    return rows[0] ?? null;
  }

  async findPendingQuestion(sourceId: string, since: string, until: string): Promise<StoredLineEvent | null> {
    const burstId = await this.request<string | null>(
      "rpc/find_unambiguous_pending_burst",
      { method: "POST", body: JSON.stringify({ p_source_id: sourceId, p_since: since, p_until: until }) },
    );
    if (!burstId) return null;
    const rows = await this.getBurstEvents(burstId);
    return rows.find((row) => row.state === "awaiting_confirmation") ?? null;
  }

  async findRecentRecordedPhoto(sourceId: string, since: string, answerAt: string): Promise<StoredLineEvent | null> {
    const rows = await this.request<StoredLineEvent[]>(
      `line_events?select=*&source_id=eq.${encodeURIComponent(sourceId)}&event_type=eq.message%3Aimage&state=eq.recorded&site_id=not.is.null&reply_sent_at=not.is.null&correction_open_until=gte.${encodeURIComponent(answerAt)}&received_at=gte.${encodeURIComponent(since)}&received_at=lte.${encodeURIComponent(answerAt)}&order=received_at.desc&limit=2`,
    );
    return rows.length === 1 ? rows[0] ?? null : null;
  }

  async resolveBurstCorrection(args: {
    answerEventId: string;
    burstId: string;
    expectedState: "awaiting_confirmation" | "recorded";
    siteId: string | null;
    newSiteName: string | null;
    observedAlias: string | null;
    originalSiteId: string | null;
    learnAlias: boolean;
    details: Record<string, unknown>;
  }): Promise<string | null> {
    return this.request<string | null>(
      "rpc/resolve_line_burst_correction",
      {
        method: "POST",
        body: JSON.stringify({
          p_answer_event_id: args.answerEventId,
          p_burst_id: args.burstId,
          p_expected_state: args.expectedState,
          p_site_id: args.siteId,
          p_new_site_name: args.newSiteName,
          p_observed_alias: args.observedAlias,
          p_original_site_id: args.originalSiteId,
          p_learn_alias: args.learnAlias,
          p_details: args.details,
        }),
      },
    );
  }

  async insertCorrectionLog(row: JsonRecord): Promise<void> {
    await this.request<void>(
      "correction_logs",
      { method: "POST", body: JSON.stringify(row) },
      "return=minimal",
    );
  }

  async getSiteByToken(token: string): Promise<SiteRecord | null> {
    const rows = await this.request<SiteRecord[]>(
      `projects?select=id,name,status,genba_page_token,last_line_activity_at&genba_page_token=eq.${encodeURIComponent(token)}&limit=1`,
    );
    return rows[0] ?? null;
  }

  async getSiteById(siteId: string): Promise<SiteRecord | null> {
    const rows = await this.request<SiteRecord[]>(
      `projects?select=id,name,status,genba_page_token,last_line_activity_at&id=eq.${encodeURIComponent(siteId)}&limit=1`,
    );
    return rows[0] ?? null;
  }

  async getSiteMedia(siteId: string): Promise<Array<{
    id: string;
    phase: "before" | "during" | "after";
    r2_key: string | null;
    caption: string | null;
    created_at: string;
  }>> {
    return this.request(
      `project_media?select=id,phase,r2_key,caption,created_at&project_id=eq.${encodeURIComponent(siteId)}&r2_key=not.is.null&order=created_at.desc`,
    );
  }

  async getSiteProgress(siteId: string): Promise<Array<{
    id: string;
    date: string;
    description: string;
    created_at: string;
  }>> {
    return this.request(
      `project_progress?select=id,date,description,created_at&project_id=eq.${encodeURIComponent(siteId)}&order=date.desc,created_at.desc`,
    );
  }

  async mediaBelongsToSite(siteId: string, r2Key: string): Promise<boolean> {
    const rows = await this.request<Array<{ id: string }>>(
      `project_media?select=id&project_id=eq.${encodeURIComponent(siteId)}&r2_key=eq.${encodeURIComponent(r2Key)}&limit=1`,
    );
    return rows.length === 1;
  }

  async getAllSites(): Promise<SiteRecord[]> {
    return this.request<SiteRecord[]>(
      "projects?select=id,name,status,genba_page_token,last_line_activity_at&order=updated_at.desc",
    );
  }

  async getWeeklyMedia(since: string, until: string): Promise<Array<{
    project_id: string;
    phase: "before" | "during" | "after";
    created_at: string;
  }>> {
    return this.request(
      `project_media?select=project_id,phase,created_at&created_at=gte.${encodeURIComponent(since)}&created_at=lt.${encodeURIComponent(until)}&order=created_at.asc`,
    );
  }

  async getCorrections(since: string, until: string): Promise<Array<{
    original_site_id: string | null;
    site_id: string | null;
    observed_alias: string | null;
    normalized_alias: string | null;
    log_type: "correction" | "normalization_hit";
    created_at: string;
  }>> {
    return this.request(
      `correction_logs?select=original_site_id,site_id,observed_alias,normalized_alias,log_type,created_at&created_at=gte.${encodeURIComponent(since)}&created_at=lt.${encodeURIComponent(until)}&order=created_at.asc`,
    );
  }

  async getReplyEvents(sourceId: string, since: string): Promise<StoredLineEvent[]> {
    return this.request<StoredLineEvent[]>(
      `line_events?select=*&source_id=eq.${encodeURIComponent(sourceId)}&reply_sent_at=gte.${encodeURIComponent(since)}&order=reply_sent_at.desc&limit=20`,
    );
  }

  async getLatestProcessedEvents(): Promise<StoredLineEvent[]> {
    return this.request<StoredLineEvent[]>(
      "rpc/get_latest_line_attempts",
      { method: "POST", body: JSON.stringify({ p_limit: 20 }) },
    );
  }

  async getTerminalFailure(): Promise<StoredLineEvent | null> {
    const rows = await this.request<StoredLineEvent[]>(
      "rpc/get_terminal_line_failure",
      { method: "POST", body: "{}" },
    );
    return rows[0] ?? null;
  }

  async claimRecoverableBurst(archiveOlderThan: string, processingOlderThan: string): Promise<string | null> {
    return this.request<string | null>(
      "rpc/claim_recoverable_line_burst",
      {
        method: "POST",
        body: JSON.stringify({
          p_archive_cutoff: archiveOlderThan,
          p_processing_cutoff: processingOlderThan,
        }),
      },
    );
  }

  async claimRecoverableText(receivedOlderThan: string, processingOlderThan: string): Promise<string | null> {
    return this.request<string | null>(
      "rpc/claim_recoverable_line_text",
      {
        method: "POST",
        body: JSON.stringify({
          p_received_cutoff: receivedOlderThan,
          p_processing_cutoff: processingOlderThan,
        }),
      },
    );
  }

  async getLineEvent(eventId: string): Promise<StoredLineEvent | null> {
    const rows = await this.request<StoredLineEvent[]>(
      `line_events?select=*&id=eq.${encodeURIComponent(eventId)}&limit=1`,
    );
    return rows[0] ?? null;
  }
}
