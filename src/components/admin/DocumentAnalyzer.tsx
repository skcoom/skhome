'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  Image,
  Loader2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import type { ExtractedProjectData } from '@/types/document-analysis';

interface DocumentAnalyzerProps {
  onApply: (data: Partial<ExtractedProjectData>) => void;
}

const categoryLabels: Record<string, string> = {
  apartment: 'マンション',
  remodeling: 'リフォーム',
  new_construction: '新築',
  house: '住宅',
};

const statusLabels: Record<string, string> = {
  planning: '計画中',
  in_progress: '施工中',
  completed: '完了',
};

export function DocumentAnalyzer({ onApply }: DocumentAnalyzerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedProjectData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supportedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    const isSupported =
      supportedTypes.includes(file.type) ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt');

    if (!isSupported) {
      setError('PDF、テキスト、または画像ファイルを選択してください');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getFileType = (file: File): 'pdf' | 'text' | 'image' => {
    if (file.type === 'application/pdf') return 'pdf';
    if (
      file.type === 'text/plain' ||
      file.type === 'text/markdown' ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt')
    ) {
      return 'text';
    }
    return 'image';
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const fileType = getFileType(selectedFile);
      let content: string;

      if (fileType === 'text') {
        content = await selectedFile.text();
      } else {
        content = await fileToBase64(selectedFile);
      }

      const response = await fetch('/api/projects/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType,
          content,
          fileName: selectedFile.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '解析に失敗しました');
      }

      setResult(data.data);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    const { confidence: _confidence, ...dataToApply } = result;
    onApply(dataToApply);

    setShowPreview(false);
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-5 w-5" />;
    if (selectedFile.type === 'application/pdf')
      return <FileText className="h-5 w-5" />;
    if (
      selectedFile.type === 'text/plain' ||
      selectedFile.name.endsWith('.md') ||
      selectedFile.name.endsWith('.txt')
    ) {
      return <FileText className="h-5 w-5" />;
    }
    return <Image className="h-5 w-5" />;
  };

  const fields = [
    { key: 'name', label: '工事名' },
    { key: 'client_name', label: '施主名' },
    { key: 'address', label: '施工場所' },
    { key: 'category', label: 'カテゴリ' },
    { key: 'status', label: 'ステータス' },
    { key: 'start_date', label: '開始日' },
    { key: 'end_date', label: '完了日' },
    { key: 'description', label: '工事概要' },
  ] as const;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-6">
      <div className="flex items-center space-x-2 mb-3">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium text-blue-900">
          要件定義書からAI自動入力
        </h3>
      </div>

      <p className="text-xs text-blue-700 mb-4">
        PDF、テキスト、または画像ファイルをアップロードすると、AIが内容を解析してフォームに自動入力します。
      </p>

      <div className="flex items-center space-x-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="bg-white"
        >
          {getFileIcon()}
          <span className="ml-2">
            {selectedFile ? selectedFile.name : 'ファイルを選択'}
          </span>
        </Button>

        {selectedFile && (
          <Button type="button" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                解析中...
              </>
            ) : (
              '解析する'
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {showPreview && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                抽出結果のプレビュー
              </h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {fields.map(({ key, label }) => {
                const value = result[key as keyof ExtractedProjectData];
                const confidence = result.confidence?.[key] ?? 0;

                let displayValue = value;
                if (key === 'category' && value) {
                  displayValue = categoryLabels[value as string] || value;
                }
                if (key === 'status' && value) {
                  displayValue = statusLabels[value as string] || value;
                }

                return (
                  <div
                    key={key}
                    className="flex items-start justify-between py-2 border-b border-gray-100"
                  >
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm text-gray-900">
                        {displayValue ? (
                          String(displayValue)
                        ) : (
                          <span className="text-gray-400">未検出</span>
                        )}
                      </p>
                    </div>
                    {value && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          confidence >= 0.8
                            ? 'bg-green-100 text-green-700'
                            : confidence >= 0.5
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        信頼度: {Math.round(confidence * 100)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                キャンセル
              </Button>
              <Button type="button" onClick={handleApply}>
                <Check className="mr-2 h-4 w-4" />
                フォームに反映
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
