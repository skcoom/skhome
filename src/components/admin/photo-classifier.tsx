'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Star, Loader2, X } from 'lucide-react';
import type { MediaPhase, PhotoClassificationResult, PendingClassificationFile } from '@/types/database';

interface ClassifiedPhoto extends PendingClassificationFile {
  classification: PhotoClassificationResult;
}

interface PhotoClassifierProps {
  projectId: string;
  files: PendingClassificationFile[];
  onConfirm: (results: { tempId: string; phase: MediaPhase; is_featured: boolean }[]) => void;
  onCancel: () => void;
}

const phaseLabels: Record<MediaPhase, string> = {
  before: '施工前',
  during: '施工中',
  after: '施工後',
};

const phaseColors: Record<MediaPhase, string> = {
  before: 'bg-amber-100 text-amber-800 border-amber-200',
  during: 'bg-blue-100 text-blue-800 border-blue-200',
  after: 'bg-green-100 text-green-800 border-green-200',
};

export function PhotoClassifier({ projectId, files, onConfirm, onCancel }: PhotoClassifierProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [classifiedPhotos, setClassifiedPhotos] = useState<ClassifiedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 分析を開始
  const startAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/classify-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '分析に失敗しました');
      }

      const data = await response.json();

      // 結果をファイルと紐付け
      const classified: ClassifiedPhoto[] = files
        .filter(f => f.type === 'image')
        .map((file) => {
          const classification = data.results.find(
            (r: PhotoClassificationResult) => r.tempId === file.tempId
          );

          return {
            ...file,
            classification: classification || {
              tempId: file.tempId,
              suggestedPhase: 'before' as MediaPhase,
              confidence: 0,
              hpSuitability: 5,
              reason: '分析結果なし',
            },
          };
        });

      setClassifiedPhotos(classified);
      setIsAnalyzing(false);
    } catch (err) {
      console.error('Classification error:', err);
      setError(err instanceof Error ? err.message : '分析に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 初回マウント時に分析開始
  useState(() => {
    startAnalysis();
  });

  // 分類を変更
  const updatePhase = (tempId: string, newPhase: MediaPhase) => {
    setClassifiedPhotos((prev) =>
      prev.map((photo) =>
        photo.tempId === tempId
          ? {
              ...photo,
              classification: {
                ...photo.classification,
                suggestedPhase: newPhase,
              },
            }
          : photo
      )
    );
  };

  // 確定
  const handleConfirm = () => {
    const results = classifiedPhotos.map((photo) => ({
      tempId: photo.tempId,
      phase: photo.classification.suggestedPhase,
      // is_featured が true = 非掲載、false = 掲載（DBの仕様に合わせる）
      is_featured: photo.classification.hpSuitability < 7,
    }));

    onConfirm(results);
  };

  // 分析中
  if (isAnalyzing && isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            AIが写真を分析しています
          </h3>
          <p className="text-sm text-gray-500">
            {files.filter(f => f.type === 'image').length}枚の画像を処理中...
          </p>
          <p className="text-xs text-gray-400 mt-2">
            数十秒かかる場合があります
          </p>
        </div>
      </div>
    );
  }

  // エラー
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-md rounded-lg bg-white p-6">
          <h3 className="text-lg font-medium text-red-600 mb-2">
            分析エラー
          </h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
            <Button onClick={startAnalysis}>
              再試行
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 結果表示
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-lg bg-white flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              AI分類結果
            </h3>
            <p className="text-sm text-gray-500">
              分類を確認・修正して「確定」を押してください
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {classifiedPhotos.map((photo) => (
              <div
                key={photo.tempId}
                className="rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* 画像 */}
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={photo.thumbnail_url || photo.file_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />

                  {/* HP適性バッジ */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        photo.classification.hpSuitability >= 7
                          ? 'bg-green-500 text-white'
                          : photo.classification.hpSuitability >= 4
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}
                    >
                      <Star className="h-3 w-3 mr-0.5" />
                      {photo.classification.hpSuitability}
                    </span>
                  </div>

                  {/* 確信度 */}
                  <div className="absolute bottom-2 left-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-black bg-opacity-60 text-white">
                      {Math.round(photo.classification.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* 分類選択 */}
                <div className="p-2 space-y-2">
                  <div className="relative">
                    <select
                      value={photo.classification.suggestedPhase}
                      onChange={(e) =>
                        updatePhase(photo.tempId, e.target.value as MediaPhase)
                      }
                      className={`w-full appearance-none rounded-md border px-3 py-1.5 pr-8 text-sm font-medium ${
                        phaseColors[photo.classification.suggestedPhase]
                      }`}
                    >
                      {(['before', 'during', 'after'] as MediaPhase[]).map(
                        (phase) => (
                          <option key={phase} value={phase}>
                            {phaseLabels[phase]}
                          </option>
                        )
                      )}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
                  </div>

                  {/* 理由 */}
                  <p className="text-xs text-gray-500 truncate" title={photo.classification.reason}>
                    {photo.classification.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 動画スキップ通知 */}
          {files.filter(f => f.type === 'video').length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-blue-50 text-sm text-blue-700">
              動画{files.filter(f => f.type === 'video').length}件は自動分類の対象外です。
              手動で分類を選択してください。
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            <span className="font-medium text-green-600">
              {classifiedPhotos.filter(p => p.classification.hpSuitability >= 7).length}枚
            </span>
            がHP掲載におすすめ
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
            <Button onClick={handleConfirm}>
              <Check className="mr-2 h-4 w-4" />
              確定して保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
