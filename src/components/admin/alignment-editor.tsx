'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, RotateCcw, Save, Loader2, Eye, EyeOff, Wand2 } from 'lucide-react';
import { useCanvasDrag } from '@/hooks/use-canvas-drag';
import type { BeforeAfterPair, AlignmentSettings, ImageTransform } from '@/types/database';

interface AlignmentEditorProps {
  pair: BeforeAfterPair;
  onClose: () => void;
  onSave: (settings: AlignmentSettings) => Promise<void>;
}

type AspectRatio = '4/3' | '16/9' | '1/1' | 'original';

const defaultTransform: ImageTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

export function AlignmentEditor({
  pair,
  onClose,
  onSave,
}: AlignmentEditorProps): React.ReactElement {
  const [isSaving, setIsSaving] = useState(false);
  const [activeImage, setActiveImage] = useState<'before' | 'after'>('after');
  const [showGuide, setShowGuide] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    pair.alignment_settings?.viewport.aspectRatio || '4/3'
  );

  const initialBefore = pair.alignment_settings?.before || defaultTransform;
  const initialAfter = pair.alignment_settings?.after || defaultTransform;

  const beforeDrag = useCanvasDrag({ initialTransform: initialBefore });
  const afterDrag = useCanvasDrag({ initialTransform: initialAfter });

  const activeDrag = activeImage === 'before' ? beforeDrag : afterDrag;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings: AlignmentSettings = {
        before: beforeDrag.transform,
        after: afterDrag.transform,
        viewport: { aspectRatio },
        autoAligned: false,
        updatedAt: new Date().toISOString(),
      };
      await onSave(settings);
      onClose();
    } catch (error) {
      console.error('Save alignment error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    beforeDrag.reset();
    afterDrag.reset();
  };

  const handleAutoAlign = useCallback(async () => {
    // 簡易的な自動アライメント：両方の画像を中央に配置し、同じスケールに
    beforeDrag.setOffset(0, 0);
    beforeDrag.setScale(1);
    afterDrag.setOffset(0, 0);
    afterDrag.setScale(1);
  }, [beforeDrag, afterDrag]);

  const getImageStyle = (transform: ImageTransform): React.CSSProperties => ({
    transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
    transformOrigin: 'center center',
  });

  const aspectRatioOptions: { value: AspectRatio; label: string }[] = [
    { value: '4/3', label: '4:3' },
    { value: '16/9', label: '16:9' },
    { value: '1/1', label: '1:1' },
    { value: 'original', label: 'オリジナル' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-medium">構図調整</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">施工前</span>
                <button
                  onClick={() => setActiveImage('before')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    activeImage === 'before'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {activeImage === 'before' ? '編集中' : '編集する'}
                </button>
              </div>
              <div
                ref={activeImage === 'before' ? beforeDrag.containerRef : undefined}
                className={`relative overflow-hidden rounded-lg bg-gray-100 cursor-move ${
                  activeImage === 'before' ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{ aspectRatio }}
                onMouseDown={activeImage === 'before' ? beforeDrag.handleMouseDown : undefined}
                onTouchStart={activeImage === 'before' ? beforeDrag.handleTouchStart : undefined}
              >
                {pair.before_media && (
                  <img
                    src={pair.before_media.file_url}
                    alt="施工前"
                    className="w-full h-full object-cover pointer-events-none"
                    style={getImageStyle(beforeDrag.transform)}
                    draggable={false}
                  />
                )}
                {activeImage === 'before' && (
                  <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">施工後</span>
                <button
                  onClick={() => setActiveImage('after')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    activeImage === 'after'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {activeImage === 'after' ? '編集中' : '編集する'}
                </button>
              </div>
              <div
                ref={activeImage === 'after' ? afterDrag.containerRef : undefined}
                className={`relative overflow-hidden rounded-lg bg-gray-100 cursor-move ${
                  activeImage === 'after' ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{ aspectRatio }}
                onMouseDown={activeImage === 'after' ? afterDrag.handleMouseDown : undefined}
                onTouchStart={activeImage === 'after' ? afterDrag.handleTouchStart : undefined}
              >
                {pair.after_media && (
                  <img
                    src={pair.after_media.file_url}
                    alt="施工後"
                    className="w-full h-full object-cover pointer-events-none"
                    style={getImageStyle(afterDrag.transform)}
                    draggable={false}
                  />
                )}
                {showGuide && pair.before_media && (
                  <img
                    src={pair.before_media.file_url}
                    alt="ガイド"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-30"
                    style={getImageStyle(beforeDrag.transform)}
                    draggable={false}
                  />
                )}
                {activeImage === 'after' && (
                  <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">横方向 (px)</label>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  value={activeDrag.transform.offsetX}
                  onChange={(e) =>
                    activeDrag.setOffset(Number(e.target.value), activeDrag.transform.offsetY)
                  }
                  className="w-full"
                />
                <div className="text-xs text-center text-gray-600 mt-1">
                  {activeDrag.transform.offsetX}
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">縦方向 (px)</label>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  value={activeDrag.transform.offsetY}
                  onChange={(e) =>
                    activeDrag.setOffset(activeDrag.transform.offsetX, Number(e.target.value))
                  }
                  className="w-full"
                />
                <div className="text-xs text-center text-gray-600 mt-1">
                  {activeDrag.transform.offsetY}
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">拡大縮小</label>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.05"
                  value={activeDrag.transform.scale}
                  onChange={(e) => activeDrag.setScale(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-center text-gray-600 mt-1">
                  {Math.round(activeDrag.transform.scale * 100)}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">アスペクト比</label>
                <div className="flex gap-2">
                  {aspectRatioOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAspectRatio(option.value)}
                      className={`px-3 py-1.5 text-sm rounded transition-colors ${
                        aspectRatio === option.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGuide(!showGuide)}
                  className="gap-2"
                >
                  {showGuide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  ガイド
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoAlign}
                  className="gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  自動調整
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            リセット
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-24">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  保存
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
