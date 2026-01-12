import type { ProjectTag, ProjectStatus } from './database';

/** 写真分析結果 */
export interface PhotoAnalysisResult {
  /** 施工内容の詳細 */
  constructionDetails: string | null;
  /** 建物の特徴 */
  buildingCharacteristics: string | null;
  /** 施工規模の推測 */
  estimatedScale: 'small' | 'medium' | 'large' | null;
  /** 使用材料の推測 */
  estimatedMaterials: string[] | null;
  /** 推測されるタグ */
  suggestedTags: ProjectTag[];
  /** 全体の確信度（0.0-1.0） */
  confidence: number;
}

/** 情報ソースの種類 */
export type InfoSourceType = 'photo' | 'document' | 'generated';

/** 情報ソース */
export interface InfoSource {
  /** 対象フィールド */
  field: keyof ProjectFieldsToIntegrate;
  /** 情報の出所 */
  source: InfoSourceType;
  /** 確信度（0.0-1.0） */
  confidence: number;
  /** 判定理由 */
  reason: string;
}

/** 統合対象のプロジェクトフィールド */
export interface ProjectFieldsToIntegrate {
  name: string | null;
  client_name: string | null;
  address: string | null;
  tags: ProjectTag[];
  status: ProjectStatus | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  public_description: string | null;
}

/** 統合結果のAPIレスポンス */
export interface IntegrationResponse {
  success: boolean;
  currentData: ProjectFieldsToIntegrate;
  suggestedData: ProjectFieldsToIntegrate;
  sources: InfoSource[];
  error?: string;
}

/** フィールドごとの比較情報（UI用） */
export interface FieldComparison {
  key: keyof ProjectFieldsToIntegrate;
  label: string;
  currentValue: string | string[] | null;
  suggestedValue: string | string[] | null;
  source: InfoSource | null;
  isSelected: boolean;
}

/** フィールドのラベル定義 */
export const FIELD_LABELS: Record<keyof ProjectFieldsToIntegrate, string> = {
  name: '工事名',
  client_name: '施主名',
  address: '施工場所',
  tags: 'タグ',
  status: 'ステータス',
  start_date: '開始日',
  end_date: '完了日',
  description: '管理用メモ',
  public_description: '公開用概要',
};
