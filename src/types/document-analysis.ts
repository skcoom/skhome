import type { ProjectCategory, ProjectStatus } from './database';

// 抽出結果の型
export interface ExtractedProjectData {
  name: string | null;
  client_name: string | null;
  address: string | null;
  category: ProjectCategory | null;
  status: ProjectStatus | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  confidence: Record<string, number>;
}

// APIリクエスト
export interface AnalyzeDocumentRequest {
  fileType: 'pdf' | 'text' | 'image';
  content: string;
  fileName: string;
}

// APIレスポンス
export interface AnalyzeDocumentResponse {
  success: boolean;
  data?: ExtractedProjectData;
  error?: string;
}
