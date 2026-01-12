'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, X, Loader2, ArrowRight } from 'lucide-react';
import type { ProjectMedia } from '@/types/database';

interface SuggestedPair {
  beforeImage: ProjectMedia;
  afterImage: ProjectMedia;
  score: number;
  reason: string;
}

interface PickupSuggestionsProps {
  projectId: string;
  onApproved?: () => void;
}

export function PickupSuggestions({ projectId, onApproved }: PickupSuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedPair[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [approvingIndex, setApprovingIndex] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setMessage(null);
    setSuggestions([]);

    try {
      const response = await fetch(`/api/projects/${projectId}/suggest-pickup`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('提案の取得に失敗しました');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setMessage(data.message);
    } catch (err) {
      console.error('Fetch suggestions error:', err);
      setMessage('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const approvePair = async (pair: SuggestedPair, index: number) => {
    setApprovingIndex(index);

    try {
      const response = await fetch(`/api/projects/${projectId}/media`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaIds: [pair.beforeImage.id, pair.afterImage.id],
          is_featured: true,
        }),
      });

      if (!response.ok) {
        throw new Error('承認に失敗しました');
      }

      // 承認したペアをリストから削除
      setSuggestions((prev) => prev.filter((_, i) => i !== index));
      setMessage('HP掲載に設定しました');

      if (onApproved) {
        onApproved();
      }
    } catch (err) {
      console.error('Approve error:', err);
      setMessage('承認に失敗しました');
    } finally {
      setApprovingIndex(null);
    }
  };

  const dismissPair = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-medium text-gray-900">AIおすすめピックアップ</h2>
        </div>
        <Button
          onClick={fetchSuggestions}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              おすすめを取得
            </>
          )}
        </Button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        施工前・施工後の写真をAIが分析し、HP掲載に最適なペアを提案します。
      </p>

      {message && suggestions.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          {message}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-4">
          {suggestions.map((pair, index) => (
            <div
              key={`${pair.beforeImage.id}-${pair.afterImage.id}`}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    スコア: {pair.score}/10
                  </span>
                  <span className="text-sm text-gray-600">{pair.reason}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={() => approvePair(pair, index)}
                    disabled={approvingIndex === index}
                  >
                    {approvingIndex === index ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        承認
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dismissPair(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">施工前</p>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={pair.beforeImage.thumbnail_url || pair.beforeImage.file_url}
                      alt="施工前"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">施工後</p>
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={pair.afterImage.thumbnail_url || pair.afterImage.file_url}
                      alt="施工後"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
          <p className="text-sm text-gray-500">
            AIが施工前・施工後の写真を分析しています...
          </p>
          <p className="text-xs text-gray-400 mt-1">
            数十秒かかる場合があります
          </p>
        </div>
      )}
    </div>
  );
}
