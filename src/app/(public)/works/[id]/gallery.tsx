'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import type { ProjectMedia } from '@/types/database';

interface GalleryProps {
  mediaByPhase: {
    before: ProjectMedia[];
    during: ProjectMedia[];
    after: ProjectMedia[];
  };
}

const phaseLabels = {
  before: '施工前',
  during: '施工中',
  after: '施工後',
};

export function WorkDetailGallery({ mediaByPhase }: GalleryProps) {
  const [activePhase, setActivePhase] = useState<'before' | 'during' | 'after'>(() => {
    if (mediaByPhase.after.length > 0) return 'after';
    if (mediaByPhase.during.length > 0) return 'during';
    return 'before';
  });

  // 全フェーズのメディアを結合（前後ナビゲーション用）
  const allMedia = [
    ...mediaByPhase.before,
    ...mediaByPhase.during,
    ...mediaByPhase.after,
  ];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedMedia = selectedIndex !== null ? allMedia[selectedIndex] : null;

  const currentMedia = mediaByPhase[activePhase];

  const availablePhases = (['before', 'during', 'after'] as const).filter(
    (phase) => mediaByPhase[phase].length > 0
  );

  // 前後ナビゲーション
  const goToPrevious = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  }, [selectedIndex]);

  const goToNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < allMedia.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, [selectedIndex, allMedia.length]);

  const closeModal = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  // キーボード操作
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          closeModal();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, goToPrevious, goToNext, closeModal]);

  // メディアをクリックしたときのハンドラ
  const handleMediaClick = (media: ProjectMedia) => {
    const index = allMedia.findIndex((m) => m.id === media.id);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  };

  return (
    <>
      {/* Phase tabs */}
      <div className="flex justify-center gap-4 mb-8">
        {availablePhases.map((phase) => (
          <button
            key={phase}
            onClick={() => setActivePhase(phase)}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              activePhase === phase
                ? 'bg-[#26A69A] text-white shadow-lg'
                : 'bg-white text-[#666666] hover:bg-[#E5E4E0]'
            }`}
          >
            {phaseLabels[phase]}
            <span className="ml-2 text-xs opacity-75">
              ({mediaByPhase[phase].length})
            </span>
          </button>
        ))}
      </div>

      {/* Media grid */}
      {currentMedia.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentMedia.map((media) => (
            <button
              key={media.id}
              onClick={() => handleMediaClick(media)}
              className="relative aspect-square bg-[#E5E4E0] rounded-lg overflow-hidden hover:opacity-90 transition-opacity group"
            >
              {media.type === 'video' ? (
                <>
                  {media.thumbnail_url ? (
                    <img
                      src={media.thumbnail_url}
                      alt={media.caption || '施工動画'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#333333]">
                      <Play className="w-12 h-12 text-white/50" />
                    </div>
                  )}
                  {/* 動画アイコンオーバーレイ */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-black/80 transition-colors">
                      <Play className="w-7 h-7 text-white ml-1" fill="white" />
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={media.file_url}
                  alt={media.caption || '施工写真'}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-[#999999]">{phaseLabels[activePhase]}の写真・動画はありません</p>
        </div>
      )}

      {/* Before/After comparison if both exist (画像のみ) */}
      {mediaByPhase.before.filter(m => m.type === 'image').length > 0 &&
       mediaByPhase.after.filter(m => m.type === 'image').length > 0 && (
        <div className="mt-16">
          <h3 className="text-xl font-medium text-[#333333] text-center mb-8">
            ビフォー・アフター
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-[#999999] mb-3 text-center">施工前</p>
              <div className="aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden">
                <img
                  src={mediaByPhase.before.find(m => m.type === 'image')!.file_url}
                  alt="施工前"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-[#999999] mb-3 text-center">施工後</p>
              <div className="aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden">
                <img
                  src={mediaByPhase.after.find(m => m.type === 'image')!.file_url}
                  alt="施工後"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeModal}
        >
          {/* 閉じるボタン */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="閉じる"
          >
            <X className="w-8 h-8" />
          </button>

          {/* 前へボタン */}
          {selectedIndex !== null && selectedIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center text-white bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              aria-label="前へ"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* 次へボタン */}
          {selectedIndex !== null && selectedIndex < allMedia.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center text-white bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              aria-label="次へ"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* メディア表示 */}
          <div
            className="max-w-full max-h-[90vh] px-16"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMedia.type === 'video' ? (
              <video
                src={selectedMedia.file_url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh]"
              >
                お使いのブラウザは動画再生に対応していません。
              </video>
            ) : (
              <img
                src={selectedMedia.file_url}
                alt={selectedMedia.caption || '施工写真'}
                className="max-w-full max-h-[85vh] object-contain"
              />
            )}
          </div>

          {/* キャプション */}
          {selectedMedia.caption && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded max-w-lg text-center">
              {selectedMedia.caption}
            </p>
          )}

          {/* インジケーター */}
          <div className="absolute bottom-4 right-4 text-white/70 text-sm">
            {selectedIndex !== null ? selectedIndex + 1 : 0} / {allMedia.length}
          </div>
        </div>
      )}
    </>
  );
}
