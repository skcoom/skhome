'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import type { ProjectMedia, BeforeAfterPair } from '@/types/database';

interface BeforeAfterPairingProps {
  projectId: string;
  media: ProjectMedia[];
}

export function BeforeAfterPairing({ projectId, media }: BeforeAfterPairingProps): React.ReactElement {
  const [pairs, setPairs] = useState<BeforeAfterPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBefore, setSelectedBefore] = useState<string | null>(null);
  const [selectedAfter, setSelectedAfter] = useState<string | null>(null);

  const beforeImages = media.filter(m => m.phase === 'before' && m.type === 'image' && !m.is_featured);
  const afterImages = media.filter(m => m.phase === 'after' && m.type === 'image' && !m.is_featured);

  const pairedBeforeIds = new Set(pairs.map(p => p.before_media_id));
  const pairedAfterIds = new Set(pairs.map(p => p.after_media_id));

  const availableBefore = beforeImages.filter(m => !pairedBeforeIds.has(m.id));
  const availableAfter = afterImages.filter(m => !pairedAfterIds.has(m.id));

  const fetchPairs = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/before-after-pairs`);
      if (!response.ok) throw new Error('ペア情報の取得に失敗しました');
      const data = await response.json();
      setPairs(data);
    } catch (err) {
      console.error('Fetch pairs error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPairs();
  }, [fetchPairs]);

  const createPair = async () => {
    if (!selectedBefore || !selectedAfter) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/before-after-pairs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          before_media_id: selectedBefore,
          after_media_id: selectedAfter,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ペアの作成に失敗しました');
      }

      const newPair = await response.json();
      setPairs(prev => [...prev, newPair]);
      setSelectedBefore(null);
      setSelectedAfter(null);
    } catch (err) {
      console.error('Create pair error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const deletePair = async (pairId: string) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/before-after-pairs?pairId=${pairId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('ペアの削除に失敗しました');

      setPairs(prev => prev.filter(p => p.id !== pairId));
    } catch (err) {
      console.error('Delete pair error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const updateLabel = async (pairId: string, label: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/before-after-pairs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair_id: pairId, label: label || null }),
      });

      if (!response.ok) throw new Error('更新に失敗しました');

      setPairs(prev =>
        prev.map(p => (p.id === pairId ? { ...p, label: label || null } : p))
      );
    } catch (err) {
      console.error('Update label error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {pairs.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">設定済みペア</h4>
          <div className="grid gap-4">
            {pairs.map((pair, index) => (
              <div
                key={pair.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">
                      ペア {index + 1}
                    </span>
                    <Input
                      placeholder="ラベル（例：キッチン）"
                      value={pair.label || ''}
                      onChange={(e) => updateLabel(pair.id, e.target.value)}
                      className="h-8 w-40 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => deletePair(pair.id)}
                    disabled={isSaving}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">施工前</p>
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                      {pair.before_media ? (
                        <img
                          src={pair.before_media.thumbnail_url || pair.before_media.file_url}
                          alt="施工前"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">施工後</p>
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                      {pair.after_media ? (
                        <img
                          src={pair.after_media.thumbnail_url || pair.after_media.file_url}
                          alt="施工後"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-4">
          新しいペアを作成
        </h4>

        {availableBefore.length === 0 || availableAfter.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {availableBefore.length === 0 && availableAfter.length === 0
              ? '施工前・施工後の画像がありません'
              : availableBefore.length === 0
              ? '未使用の施工前画像がありません'
              : '未使用の施工後画像がありません'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  施工前を選択（{availableBefore.length}枚）
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {availableBefore.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedBefore(m.id === selectedBefore ? null : m.id)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedBefore === m.id
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={m.thumbnail_url || m.file_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">
                  施工後を選択（{availableAfter.length}枚）
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {availableAfter.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedAfter(m.id === selectedAfter ? null : m.id)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedAfter === m.id
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={m.thumbnail_url || m.file_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={createPair}
                disabled={!selectedBefore || !selectedAfter || isSaving}
                className="min-w-32"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    ペアを作成
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {pairs.length === 0 && availableBefore.length > 0 && availableAfter.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          施工前と施工後の画像を選択してペアを作成すると、公開ページでスライダー比較が表示されます。
        </p>
      )}
    </div>
  );
}
