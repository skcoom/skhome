-- project_documentsテーブルにdocument_typeカラムを追加
-- 書類タイプ: estimate(見積書), invoice(請求書), contract(契約書), other(その他)

ALTER TABLE project_documents
ADD COLUMN document_type text NOT NULL DEFAULT 'other';

-- 有効な値のみ許可するチェック制約を追加
ALTER TABLE project_documents
ADD CONSTRAINT valid_document_type
CHECK (document_type IN ('estimate', 'invoice', 'contract', 'other'));

-- インデックスを追加（プロジェクトごとの書類タイプ検索を高速化）
CREATE INDEX idx_project_documents_type ON project_documents(project_id, document_type);
