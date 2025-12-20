'use client';

import { useState, useEffect } from 'react';
import { ImageIcon, Film, Check, X, Loader2 } from 'lucide-react';
import type { ProjectMedia, Project } from '@/types/database';

type MediaWithProject = ProjectMedia & {
  projects: Pick<Project, 'id' | 'name'>;
};

interface HeroSettingsProps {
  allMedia: MediaWithProject[];
  initialHeroMedia: MediaWithProject[];
}

export function HeroSettings({ allMedia, initialHeroMedia }: HeroSettingsProps) {
  const [selectedMedia, setSelectedMedia] = useState<(MediaWithProject | null)[]>([null, null, null]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const initial: (MediaWithProject | null)[] = [null, null, null];
    initialHeroMedia.forEach((media) => {
      if (media.hero_position && media.hero_position >= 1 && media.hero_position <= 3) {
        initial[media.hero_position - 1] = media;
      }
    });
    setSelectedMedia(initial);
  }, [initialHeroMedia]);

  const handleSelect = (position: number, media: MediaWithProject | null) => {
    const newSelection = [...selectedMedia];

    // 既に別の位置で選択されている場合は解除
    if (media) {
      const existingIndex = newSelection.findIndex((m) => m?.id === media.id);
      if (existingIndex !== -1 && existingIndex !== position) {
        newSelection[existingIndex] = null;
      }
    }

    newSelection[position] = media;
    setSelectedMedia(newSelection);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const selections = selectedMedia
        .map((media, index) => media ? { mediaId: media.id, position: (index + 1) as 1 | 2 | 3 } : null)
        .filter((s): s is { mediaId: string; position: 1 | 2 | 3 } => s !== null);

      const response = await fetch('/api/settings/hero', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections }),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      setSaveMessage({ type: 'success', text: '保存しました' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const isMediaSelected = (mediaId: string) => {
    return selectedMedia.some((m) => m?.id === mediaId);
  };

  const positionLabels = ['左上', '左下', '右'];

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">ファーストビュー設定</h2>
          <p className="text-sm text-gray-500">トップページのファーストビューに表示するメディアを選択</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              保存中...
            </>
          ) : (
            '保存'
          )}
        </button>
      </div>

      {saveMessage && (
        <div className={`mb-4 p-3 rounded-md ${saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {saveMessage.text}
        </div>
      )}

      {/* 選択済みメディアのプレビュー */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">選択中のメディア</h3>
        <div className="grid grid-cols-3 gap-4">
          {selectedMedia.map((media, index) => (
            <div key={index} className="relative">
              <p className="text-xs text-gray-500 mb-1">{positionLabels[index]}</p>
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                {media ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={media.thumbnail_url || media.file_url}
                      alt=""
                      className="w-full h-full object-cover object-center"
                    />
                    {!media.thumbnail_url && media.type === 'video' && (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Film className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleSelect(index, null)}
                        className="opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-full transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {media.type === 'video' && (
                      <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                        <Film className="h-3 w-3 inline mr-1" />
                        動画
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-sm">未選択</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* メディア一覧 */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">メディア一覧（クリックして選択）</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1">
          {allMedia.map((media) => {
            const selected = isMediaSelected(media.id);
            const selectedPosition = selectedMedia.findIndex((m) => m?.id === media.id);

            return (
              <div
                key={media.id}
                className="relative cursor-pointer group"
                onClick={() => {
                  if (selected) {
                    handleSelect(selectedPosition, null);
                  } else {
                    const emptyIndex = selectedMedia.findIndex((m) => m === null);
                    if (emptyIndex !== -1) {
                      handleSelect(emptyIndex, media);
                    }
                  }
                }}
              >
                <div className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}>
                  {media.type === 'video' ? (
                    <div className="relative w-full h-full bg-gray-200">
                      {media.thumbnail_url ? (
                        <img src={media.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                        <Film className="h-3 w-3" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={media.thumbnail_url || media.file_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {selected && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {selectedPosition + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {allMedia.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            メディアがありません。プロジェクトに写真や動画を追加してください。
          </p>
        )}
      </div>
    </div>
  );
}
