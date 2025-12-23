'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  Sparkles,
  ExternalLink,
  X,
  Check,
  AlertCircle,
  Lock,
  Globe,
} from 'lucide-react';
import type { ProjectDocument } from '@/types/database';

interface DocumentManagerProps {
  projectId: string;
  onDescriptionUpdate?: (description: string) => void;
  onPublicDescriptionUpdate?: (publicDescription: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function DocumentManager({ projectId, onDescriptionUpdate, onPublicDescriptionUpdate }: DocumentManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<string>('');
  const [currentPublicSummary, setCurrentPublicSummary] = useState<string>('');

  // ドキュメント一覧を取得
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`);
      if (!response.ok) throw new Error('取得に失敗しました');
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      console.error('Document fetch error:', err);
      setError('ドキュメントの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ファイルアップロード
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('PDFファイルのみアップロード可能です');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'アップロードに失敗しました');
      }

      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // AI解析
  const handleAnalyze = async (docId: string) => {
    setAnalyzingId(docId);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/documents/${docId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '解析に失敗しました');
      }

      const data = await response.json();
      setCurrentSummary(data.summary || '');
      setCurrentPublicSummary(data.publicSummary || '');
      setShowSummaryModal(true);

      // ドキュメント一覧を更新
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析に失敗しました');
    } finally {
      setAnalyzingId(null);
    }
  };

  // ドキュメント削除
  const handleDelete = async (docId: string) => {
    if (!confirm('このドキュメントを削除してよろしいですか？')) return;

    setDeletingId(docId);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/documents?docId=${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '削除に失敗しました');
      }

      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  // 管理用メモに反映
  const handleApplyToDescription = () => {
    if (onDescriptionUpdate && currentSummary) {
      onDescriptionUpdate(currentSummary);
    }
    setShowSummaryModal(false);
  };

  // 公開用概要に反映
  const handleApplyToPublicDescription = () => {
    if (onPublicDescriptionUpdate && currentPublicSummary) {
      onPublicDescriptionUpdate(currentPublicSummary);
    }
    setShowSummaryModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">ドキュメント</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                PDFをアップロード
              </>
            )}
          </Button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center space-x-2 rounded-md bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ドキュメント一覧 */}
      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            図面や見積りのPDFをアップロードしてください
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                    {doc.ai_summary && ' • 解析済み'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* 表示ボタン */}
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="PDFを開く"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>

                {/* AI解析ボタン */}
                <button
                  type="button"
                  onClick={() => handleAnalyze(doc.id)}
                  disabled={analyzingId === doc.id}
                  className="rounded p-2 text-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                  title="AI解析"
                >
                  {analyzingId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </button>

                {/* 削除ボタン */}
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className="rounded p-2 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="削除"
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 解析結果モーダル */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">AI解析結果</h3>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* 管理用メモ */}
              {currentSummary && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">管理用メモ（社内向け）</span>
                    </div>
                    {onDescriptionUpdate && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleApplyToDescription}
                      >
                        反映する
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">{currentSummary}</p>
                </div>
              )}

              {/* 公開用概要 */}
              {currentPublicSummary && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">公開用概要（お客様向け）</span>
                    </div>
                    {onPublicDescriptionUpdate && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleApplyToPublicDescription}
                      >
                        反映する
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-green-900 whitespace-pre-wrap">{currentPublicSummary}</p>
                </div>
              )}

              {/* 両方とも空の場合 */}
              {!currentSummary && !currentPublicSummary && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">解析結果がありませんでした</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSummaryModal(false)}
              >
                閉じる
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
