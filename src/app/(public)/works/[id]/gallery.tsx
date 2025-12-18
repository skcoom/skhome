'use client';

import { useState } from 'react';
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
    // デフォルトは画像がある最初のフェーズ
    if (mediaByPhase.after.length > 0) return 'after';
    if (mediaByPhase.during.length > 0) return 'during';
    return 'before';
  });
  const [selectedImage, setSelectedImage] = useState<ProjectMedia | null>(null);

  const currentMedia = mediaByPhase[activePhase];

  // 利用可能なフェーズのみ表示
  const availablePhases = (['before', 'during', 'after'] as const).filter(
    (phase) => mediaByPhase[phase].length > 0
  );

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

      {/* Image grid */}
      {currentMedia.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentMedia.map((media) => (
            <button
              key={media.id}
              onClick={() => setSelectedImage(media)}
              className="aspect-square bg-[#E5E4E0] rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
            >
              <img
                src={media.file_url}
                alt={media.caption || '施工写真'}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-[#999999]">{phaseLabels[activePhase]}の写真はありません</p>
        </div>
      )}

      {/* Before/After comparison if both exist */}
      {mediaByPhase.before.length > 0 && mediaByPhase.after.length > 0 && (
        <div className="mt-16">
          <h3 className="text-xl font-medium text-[#333333] text-center mb-8">
            ビフォー・アフター
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-[#999999] mb-3 text-center">施工前</p>
              <div className="aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden">
                <img
                  src={mediaByPhase.before[0].file_url}
                  alt="施工前"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-[#999999] mb-3 text-center">施工後</p>
              <div className="aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden">
                <img
                  src={mediaByPhase.after[0].file_url}
                  alt="施工後"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:opacity-75 transition-opacity"
          >
            ×
          </button>
          <img
            src={selectedImage.file_url}
            alt={selectedImage.caption || '施工写真'}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {selectedImage.caption && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded">
              {selectedImage.caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
