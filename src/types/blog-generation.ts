import type { ProjectTag, MediaPhase, DocumentType } from './database';

/** ドキュメントから抽出された要約情報 */
export interface DocumentSummary {
  documentType: DocumentType;
  extractedData?: {
    name?: string;
    client_name?: string;
    address?: string;
    tags?: ProjectTag[];
    description?: string;
    start_date?: string;
    end_date?: string;
  };
}

/** 写真情報のサマリー */
export interface PhotoInfo {
  beforeCount: number;
  duringCount: number;
  afterCount: number;
  featuredPhotos: {
    phase: MediaPhase;
    caption?: string;
  }[];
  hasBeforeAfter: boolean;
}

/** ブログ生成用の拡張プロジェクト情報 */
export interface EnhancedProjectData {
  // 基本情報
  name: string;
  tags: ProjectTag[];
  clientName?: string;
  address?: string;

  // 詳細情報
  description?: string;
  publicDescription?: string;
  startDate?: string;
  endDate?: string;

  // ドキュメントから抽出した情報
  documentSummaries: DocumentSummary[];

  // 写真情報
  photoInfo: PhotoInfo;
}

/** 生成されたブログ記事 */
export interface GeneratedBlogPost {
  title: string;
  excerpt: string;
  content: string;
}
