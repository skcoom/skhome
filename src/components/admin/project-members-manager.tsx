'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PartnerOption {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  assigned: boolean;
}

export function ProjectMembersManager({ projectId }: { projectId: string }) {
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/members`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || '担当者情報を取得できませんでした');
        setPartners(payload.partners || []);
        setSelected(new Set((payload.partners || []).filter((partner: PartnerOption) => partner.assigned).map((partner: PartnerOption) => partner.id)));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : '担当者情報を取得できませんでした'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const toggle = (userId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [...selected] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '担当者設定を保存できませんでした');
      setMessage('担当者設定を保存しました。選ばれた協力会社だけが、この現場を閲覧できます。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '担当者設定を保存できませんでした');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-medium text-gray-900">協力会社の閲覧担当</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">選択した協力会社アカウントだけが、この現場を閲覧できます。編集や利益情報の閲覧はできません。</p>

      {loading ? (
        <div className="mt-4 flex items-center text-sm text-gray-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />読み込み中...</div>
      ) : partners.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">協力会社アカウントは登録されていません。</p>
      ) : (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {partners.map((partner) => (
            <label key={partner.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
              <input type="checkbox" checked={selected.has(partner.id)} onChange={() => toggle(partner.id)} className="mt-1 h-4 w-4 rounded border-gray-300" />
              <span className="min-w-0 text-sm">
                <span className="block font-medium text-gray-900">{partner.name}</span>
                <span className="block truncate text-gray-500">{partner.company_name || partner.email}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {message && <p className="mt-4 text-sm text-blue-700" role="status">{message}</p>}
      {!loading && partners.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            担当者設定を保存
          </Button>
        </div>
      )}
    </section>
  );
}
