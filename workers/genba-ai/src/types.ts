export interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface WorkerScheduledController {
  readonly scheduledTime: number;
  readonly cron: string;
}

interface PhotoHttpMetadata {
  contentType?: string;
}

interface PhotoObjectMetadata {
  httpMetadata?: PhotoHttpMetadata;
}

interface PhotoObjectBody extends PhotoObjectMetadata {
  readonly size: number;
  readonly body: ReadableStream<Uint8Array>;
  readonly httpEtag: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface PhotoPutOptions {
  httpMetadata?: PhotoHttpMetadata;
  customMetadata?: Record<string, string>;
}

export interface PhotoBucket {
  head(key: string): Promise<PhotoObjectMetadata | null>;
  get(key: string): Promise<PhotoObjectBody | null>;
  put(
    key: string,
    value: ReadableStream<Uint8Array> | ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: PhotoPutOptions,
  ): Promise<unknown>;
}

export interface Env {
  PHOTOS: PhotoBucket;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PUBLIC_BASE_URL: string;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL: "claude-haiku-4-5" | "claude-sonnet-5";
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_API_BASE_URL: string;
  LINE_DATA_API_BASE_URL: string;
  LINE_SUMMARY_USER_ID: string;
  TEST_MODE?: "true";
}

export type LineSource =
  | { type: "user"; userId: string }
  | { type: "group"; groupId: string; userId?: string }
  | { type: "room"; roomId: string; userId?: string };

export interface LineImageMessage {
  id: string;
  type: "image";
  contentProvider?: { type: "line" | "external"; originalContentUrl?: string };
}

export interface LineTextMessage {
  id: string;
  type: "text";
  text: string;
  quotedMessageId?: string;
}

export interface LineMessageEvent {
  type: "message";
  mode?: "active" | "standby";
  timestamp: number;
  source: LineSource;
  webhookEventId?: string;
  deliveryContext?: { isRedelivery: boolean };
  replyToken?: string;
  message: LineImageMessage | LineTextMessage | { id: string; type: string };
}

export interface LineWebhookBody {
  destination?: string;
  events: LineMessageEvent[];
}

export type MatcherAction = "assign" | "ask" | "ask_similar" | "create" | "ignore";
export type MediaPhase = "before" | "during" | "after" | "unknown";

export interface MatcherResult {
  action: MatcherAction;
  site_id?: string;
  site_name?: string;
  new_site_name?: string;
  candidates: string[];
  phase: MediaPhase;
  confidence: number;
  reasoning: string;
}

export interface SiteRecord {
  id: string;
  name: string;
  status?: string;
  last_line_activity_at?: string;
  created_at?: string;
}

export interface AliasRecord {
  site_id: string;
  alias: string;
  source: string;
  site_name?: string;
}

export interface StoredLineEvent {
  id: string;
  message_id: string;
  source_id: string;
  sender_id: string | null;
  sender_name: string | null;
  raw_payload: LineMessageEvent;
  text_content: string | null;
  r2_key: string | null;
  content_type: string | null;
  burst_id: string | null;
  site_id: string | null;
  action: MatcherAction | null;
  phase: MediaPhase | null;
  confidence: number | null;
  candidates: string[] | null;
  new_site_name?: string | null;
  state: string;
  error: string | null;
  received_at: string;
  processed_at: string | null;
  reply_sent_at: string | null;
  attempt_count: number;
}

export interface MatchContext {
  event: {
    sender: string;
    text: string | null;
    images: number;
    image_description?: string;
  };
  sender_context: Array<{
    site_id: string;
    site: string;
    when: string;
    text: string | null;
  }>;
  group_context: Array<{
    sender: string;
    text: string | null;
    site: string | null;
    when: string;
  }>;
  sites: SiteRecord[];
  aliases: AliasRecord[];
}

export interface VisionImage {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
}

export interface BotTemplate {
  template_id: TemplateId;
  body: string;
  variables: string[];
  approved_at: string | null;
  approved_by: string | null;
}

export type GroupTemplateId =
  | "photo_auto"
  | "photo_ask"
  | "answer_done"
  | "correction_done"
  | "create_confirm"
  | "create_done";

export type PushTemplateId = "T-06" | "T-07";
export type TemplateId = GroupTemplateId | PushTemplateId;
