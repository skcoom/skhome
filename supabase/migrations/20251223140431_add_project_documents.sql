-- project_documents テーブル: 現場に紐付くPDFドキュメント
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  ai_summary TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_project_documents_project_id ON project_documents(project_id);

-- RLSを有効化
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 認証済みユーザーは全て閲覧可能
CREATE POLICY "Authenticated users can view project documents"
  ON project_documents
  FOR SELECT
  TO authenticated
  USING (true);

-- RLSポリシー: 認証済みユーザーは挿入可能
CREATE POLICY "Authenticated users can insert project documents"
  ON project_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLSポリシー: 認証済みユーザーは更新可能
CREATE POLICY "Authenticated users can update project documents"
  ON project_documents
  FOR UPDATE
  TO authenticated
  USING (true);

-- RLSポリシー: 認証済みユーザーは削除可能
CREATE POLICY "Authenticated users can delete project documents"
  ON project_documents
  FOR DELETE
  TO authenticated
  USING (true);
