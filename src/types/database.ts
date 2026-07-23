// Database types for Supabase

export type UserRole = 'admin' | 'staff' | 'partner';
export type ProjectStatus = 'planning' | 'in_progress' | 'completed';
/** @deprecated tagsを使用してください */
export type ProjectCategory = 'apartment' | 'remodeling' | 'new_construction' | 'house';
export type ProjectTag =
  | '全面リフォーム'
  | 'キッチン'
  | '浴室・洗面'
  | 'トイレ'
  | 'リビング・居室'
  | '玄関・廊下'
  | '外壁・屋根'
  | '看板'
  | '住宅'
  | '店舗';
export type MediaType = 'image' | 'video';
export type MediaPhase = 'before' | 'during' | 'after';
export type MediaSourceOrigin = 'manual' | 'line';
export type MediaPublicationStatus = 'internal' | 'selected' | 'published';
export type DocumentType = 'estimate' | 'invoice' | 'contract' | 'other';
export type BlogCategory = 'news' | 'column' | 'case_study';
export type BlogStatus = 'draft' | 'published';
export type ContactStatus = 'pending' | 'in_progress' | 'completed';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company_name?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  address?: string;
  /** @deprecated tagsを使用してください */
  category: ProjectCategory;
  tags: ProjectTag[];
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  /** 管理者向け詳細メモ（価格、資材情報含む） */
  description?: string;
  /** 公開ページ向けお客様向け概要文 */
  public_description?: string;
  /** 施主名を含めない、公開専用の施工実績名 */
  public_title?: string;
  /** 市区町村など、公開してよい範囲に丸めた地域名 */
  public_location?: string;
  /** 公開項目を人が最終確認した日時 */
  public_reviewed_at?: string;
  public_reviewed_by?: string;
  is_public: boolean;
  main_media_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_line_activity_at?: string | null;
}

export interface ProjectMedia {
  id: string;
  project_id: string;
  type: MediaType;
  phase: MediaPhase;
  file_url: string;
  thumbnail_url?: string | null;
  caption?: string;
  uploaded_by?: string;
  is_featured: boolean;
  genba_line_event_id?: string | null;
  source_origin?: MediaSourceOrigin | null;
  publication_status?: MediaPublicationStatus | null;
  public_storage_path?: string | null;
  public_thumbnail_path?: string | null;
  private_storage_bucket?: string | null;
  private_storage_path?: string | null;
  private_thumbnail_path?: string | null;
  private_large_path?: string | null;
  published_at?: string | null;
  published_by?: string | null;
  hero_position?: 1 | 2 | 3 | null;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  document_type: DocumentType;
  file_url: string;
  storage_bucket?: string;
  storage_path?: string;
  file_name: string;
  file_size: number;
  ai_summary?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface ProjectWithDocumentStatus extends Project {
  hasEstimate: boolean;
  hasInvoice: boolean;
  hasContract: boolean;
}

export interface ProjectProgress {
  id: string;
  project_id: string;
  date: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  category: BlogCategory;
  status: BlogStatus;
  ai_generated: boolean;
  project_id?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: ContactStatus;
  created_at: string;
}

/** 画像の位置調整設定 */
export interface ImageTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

/** ビフォーアフター構図調整設定 */
export interface AlignmentSettings {
  before: ImageTransform;
  after: ImageTransform;
  viewport: {
    aspectRatio: '4/3' | '16/9' | '1/1' | 'original';
  };
  autoAligned: boolean;
  updatedAt: string;
}

/** ビフォーアフターのペア情報 */
export interface BeforeAfterPair {
  id: string;
  project_id: string;
  before_media_id: string;
  after_media_id: string;
  display_order: number;
  label: string | null;
  alignment_settings: AlignmentSettings | null;
  created_at: string;
  before_media?: ProjectMedia;
  after_media?: ProjectMedia;
}

// ========================================
// 原価管理システム - 型定義
// ========================================

/** 進捗工程フェーズ */
export type ProgressPhase =
  | '着工準備'
  | '解体'
  | '下地工事'
  | '設備工事'
  | '仕上げ工事'
  | '検査・引渡し'
  | 'その他';

/** 発注ステータス */
export type OrderStatus = 'draft' | 'ordered' | 'delivered';

/** 追加工事ステータス */
export type AdditionalWorkStatus = 'proposed' | 'accepted' | 'declined';

/** 発注先マスタ */
export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

/** 発注情報 */
export interface Order {
  id: string;
  project_id: string;
  supplier_id: string;
  order_date: string;
  delivery_date?: string;
  status: OrderStatus;
  total_amount: number;
  tax_amount: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  supplier?: Supplier;
  items?: OrderItem[];
}

/** 発注明細 */
export interface OrderItem {
  id: string;
  order_id: string;
  item_name: string;
  specification?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  amount: number;
  sort_order: number;
}

/** 人工記録 */
export interface LaborRecord {
  id: string;
  project_id: string;
  work_date: string;
  worker_count: number;
  description?: string;
  created_by?: string;
  created_at: string;
}

/** 現場予算 */
export interface ProjectBudget {
  id: string;
  project_id: string;
  estimate_amount: number;
  material_budget: number;
  labor_budget?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/** 追加工事マスタ */
export interface AdditionalWorkTemplate {
  id: string;
  name: string;
  category: string;
  default_price: number;
  description?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

/** 現場別追加工事 */
export interface ProjectAdditionalWork {
  id: string;
  project_id: string;
  template_id?: string;
  name: string;
  price: number;
  status: AdditionalWorkStatus;
  notes?: string;
  created_at: string;
  template?: AdditionalWorkTemplate;
}

/** システム設定 */
export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

/** コスト消化サマリー */
export interface CostSummary {
  estimate_amount: number;
  allowable_cost: number;
  material_budget: number;
  labor_budget: number;
  allowable_labor_count: number;
  material_spent: number;
  labor_spent: number;
  remaining_material: number;
  remaining_labor: number;
  material_percentage: number;
  labor_percentage: number;
  projected_cost: number;
  projected_profit: number;
  projected_profit_rate: number;
}

/** 利益サマリー（一覧用） */
export interface ProfitSummary {
  project_id: string;
  project_name: string;
  status: ProjectStatus;
  estimate_amount: number;
  material_budget: number;
  labor_budget: number;
  material_spent: number;
  labor_spent: number;
  material_percentage: number;
  labor_percentage: number;
  projected_profit_rate: number;
  remaining_labor_count: number;
  has_warning: boolean;
  warning_type?: 'over_budget' | 'near_limit';
}

/** 進捗記録（拡張版） */
export interface ProjectProgressExtended extends ProjectProgress {
  phase?: ProgressPhase;
  progress_percentage?: number;
}

/** AI写真分類の結果 */
export interface PhotoClassificationResult {
  /** アップロード時の一時ID（ファイル名ベース） */
  tempId: string;
  /** 判定された施工段階 */
  suggestedPhase: MediaPhase;
  /** 判定の確信度（0.0-1.0） */
  confidence: number;
  /** HP掲載適性スコア（1-10） */
  hpSuitability: number;
  /** 判定理由 */
  reason: string;
}

/** アップロード後のAI分類待ちファイル */
export interface PendingClassificationFile {
  tempId: string;
  file_url: string;
  thumbnail_url?: string;
  type: MediaType;
  storage_paths?: string[];
  private_storage_path?: string;
  private_thumbnail_path?: string;
  private_large_path?: string;
}

// Database schema for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>;
      };
      project_media: {
        Row: ProjectMedia;
        Insert: Omit<ProjectMedia, 'id' | 'created_at'>;
        Update: Partial<Omit<ProjectMedia, 'id' | 'created_at'>>;
      };
      project_documents: {
        Row: ProjectDocument;
        Insert: Omit<ProjectDocument, 'id' | 'created_at'>;
        Update: Partial<Omit<ProjectDocument, 'id' | 'created_at'>>;
      };
      project_progress: {
        Row: ProjectProgress;
        Insert: Omit<ProjectProgress, 'id' | 'created_at'>;
        Update: Partial<Omit<ProjectProgress, 'id' | 'created_at'>>;
      };
      blog_posts: {
        Row: BlogPost;
        Insert: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>>;
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, 'id' | 'created_at'>;
        Update: Partial<Omit<Contact, 'id' | 'created_at'>>;
      };
      before_after_pairs: {
        Row: BeforeAfterPair;
        Insert: Omit<BeforeAfterPair, 'id' | 'created_at' | 'before_media' | 'after_media'>;
        Update: Partial<Omit<BeforeAfterPair, 'id' | 'created_at' | 'before_media' | 'after_media'>>;
      };
    };
  };
}
