import Link from 'next/link';
import { Calculator, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="mt-1 text-sm text-gray-500">管理システムで使用する共通設定を確認します</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-medium text-gray-900">利益計算の設定</h2>
              <p className="text-sm text-gray-500">人工単価と目標利益率を設定します</p>
            </div>
          </div>
          <Link href="/admin/settings/cost" className="mt-5 inline-block">
            <Button>コスト設定を開く</Button>
          </Link>
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-gray-900">ホームページのメイン画像</h2>
                <Lock className="h-4 w-4 text-amber-700" />
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                現在のトップページは、承認済みデザインの画像を固定表示しています。この画面から画像を変えてもホームページには反映されないため、誤操作を防ぐ目的で編集機能を停止しています。
              </p>
              <p className="mt-2 text-xs text-amber-800">変更が必要な場合は、公開サイトの改修としてプレビュー確認後に反映します。</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
