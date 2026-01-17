-- =====================================================
-- 原価管理システム - データベーススキーマ
-- =====================================================

-- 既存のproject_progressテーブルに列を追加
ALTER TABLE project_progress
ADD COLUMN IF NOT EXISTS phase text,
ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0;

-- =====================================================
-- 発注先マスタ（suppliers）
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- RLSを有効化
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは閲覧可能
CREATE POLICY "suppliers_select_authenticated" ON suppliers
  FOR SELECT TO authenticated
  USING (true);

-- admin/staffのみ作成・更新・削除可能
CREATE POLICY "suppliers_insert_admin_staff" ON suppliers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "suppliers_update_admin_staff" ON suppliers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "suppliers_delete_admin_staff" ON suppliers
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

-- =====================================================
-- 発注情報（orders）
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  order_date date NOT NULL,
  delivery_date date,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('draft', 'ordered', 'delivered')),
  total_amount integer NOT NULL DEFAULT 0,
  tax_amount integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS orders_project_id_idx ON orders(project_id);
CREATE INDEX IF NOT EXISTS orders_supplier_id_idx ON orders(supplier_id);

-- RLSを有効化
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_authenticated" ON orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "orders_insert_admin_staff" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "orders_update_admin_staff" ON orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "orders_delete_admin_staff" ON orders
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

-- =====================================================
-- 発注明細（order_items）
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  specification text,
  quantity decimal NOT NULL,
  unit text,
  unit_price integer NOT NULL,
  amount integer NOT NULL,
  sort_order integer DEFAULT 0
);

-- インデックス
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

-- RLSを有効化
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_authenticated" ON order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "order_items_insert_admin_staff" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "order_items_update_admin_staff" ON order_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "order_items_delete_admin_staff" ON order_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

-- =====================================================
-- 人工記録（labor_records）
-- =====================================================
CREATE TABLE IF NOT EXISTS labor_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  worker_count decimal NOT NULL,
  description text,
  created_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS labor_records_project_id_idx ON labor_records(project_id);
CREATE INDEX IF NOT EXISTS labor_records_work_date_idx ON labor_records(work_date);

-- RLSを有効化
ALTER TABLE labor_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labor_records_select_authenticated" ON labor_records
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "labor_records_insert_admin_staff" ON labor_records
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "labor_records_update_admin_staff" ON labor_records
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "labor_records_delete_admin_staff" ON labor_records
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

-- =====================================================
-- 現場予算（project_budgets）
-- =====================================================
CREATE TABLE IF NOT EXISTS project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  estimate_amount integer NOT NULL,
  material_budget integer NOT NULL,
  labor_budget integer,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS project_budgets_project_id_idx ON project_budgets(project_id);

-- RLSを有効化
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_budgets_select_authenticated" ON project_budgets
  FOR SELECT TO authenticated
  USING (true);

-- adminのみ作成・更新可能（見積金額は重要情報）
CREATE POLICY "project_budgets_insert_admin" ON project_budgets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "project_budgets_update_admin" ON project_budgets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "project_budgets_delete_admin" ON project_budgets
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- 追加工事マスタ（additional_work_templates）
-- =====================================================
CREATE TABLE IF NOT EXISTS additional_work_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  default_price integer NOT NULL,
  description text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- RLSを有効化
ALTER TABLE additional_work_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "additional_work_templates_select_authenticated" ON additional_work_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "additional_work_templates_insert_admin_staff" ON additional_work_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "additional_work_templates_update_admin_staff" ON additional_work_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "additional_work_templates_delete_admin_staff" ON additional_work_templates
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

-- 初期データ
INSERT INTO additional_work_templates (name, category, default_price, description) VALUES
  ('食洗機設置', 'キッチン', 150000, 'キッチンリフォームと同時施工がお得'),
  ('浴室乾燥機追加', '浴室', 80000, '浴室リフォームと同時なら工賃込み'),
  ('床暖房設置', 'リビング', 400000, 'リビング全体に快適な暖かさ'),
  ('窓の断熱改修', '全体', 250000, '光熱費削減に効果的'),
  ('トイレ交換', 'トイレ', 120000, '節水型最新トイレへの交換'),
  ('壁紙張替え', '全体', 50000, 'お部屋の雰囲気を一新'),
  ('照明LED化', '全体', 30000, '省エネで長寿命な照明に'),
  ('コンセント増設', '電気', 15000, '使い勝手を向上')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 現場別追加工事（project_additional_works）
-- =====================================================
CREATE TABLE IF NOT EXISTS project_additional_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id uuid REFERENCES additional_work_templates(id),
  name text NOT NULL,
  price integer NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'declined')),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS project_additional_works_project_id_idx ON project_additional_works(project_id);

-- RLSを有効化
ALTER TABLE project_additional_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_additional_works_select_authenticated" ON project_additional_works
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "project_additional_works_insert_admin_staff" ON project_additional_works
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "project_additional_works_update_admin_staff" ON project_additional_works
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "project_additional_works_delete_admin_staff" ON project_additional_works
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'staff')
    )
  );

-- =====================================================
-- システム設定（system_settings）
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now()
);

-- RLSを有効化
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings_select_authenticated" ON system_settings
  FOR SELECT TO authenticated
  USING (true);

-- adminのみ更新可能
CREATE POLICY "system_settings_update_admin" ON system_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 初期データ
INSERT INTO system_settings (key, value, description) VALUES
  ('labor_unit_price', '25000', '人工単価（円/人工）'),
  ('target_profit_rate', '20', '目標利益率（%）')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 便利なビュー: 現場ごとのコスト集計
-- =====================================================
CREATE OR REPLACE VIEW project_cost_summary AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.status,
  pb.estimate_amount,
  pb.material_budget,
  pb.labor_budget,
  COALESCE(SUM(o.total_amount + o.tax_amount), 0)::integer AS material_spent,
  COALESCE(SUM(lr.worker_count), 0)::decimal AS labor_spent_count,
  (
    SELECT CAST(value AS integer) FROM system_settings WHERE key = 'labor_unit_price'
  ) AS labor_unit_price,
  (
    SELECT CAST(value AS integer) FROM system_settings WHERE key = 'target_profit_rate'
  ) AS target_profit_rate
FROM projects p
LEFT JOIN project_budgets pb ON p.id = pb.project_id
LEFT JOIN orders o ON p.id = o.project_id AND o.status != 'draft'
LEFT JOIN labor_records lr ON p.id = lr.project_id
GROUP BY p.id, p.name, p.status, pb.estimate_amount, pb.material_budget, pb.labor_budget;
