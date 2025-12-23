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
  MessageSquare,
} from 'lucide-react';
import type { ExtractedProjectData } from '@/types/document-analysis';

interface DocumentAnalyzerProps {
  onApply: (data: Partial<ExtractedProjectData>) => void;
  onFileSelect?: (file: File | null) => void;
  showSaveOption?: boolean;
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

type InputMode = 'file' | 'text';

export function DocumentAnalyzer({ onApply, onFileSelect, showSaveOption = false }: DocumentAnalyzerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedProjectData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saveFile, setSaveFile] = useState(false);

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
    if (inputMode === 'file' && !selectedFile) return;
    if (inputMode === 'text' && !textInput.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      let fileType: 'pdf' | 'text' | 'image';
      let content: string;
      let fileName: string;

      if (inputMode === 'file' && selectedFile) {
        fileType = getFileType(selectedFile);
        fileName = selectedFile.name;

        if (fileType === 'text') {
          content = await selectedFile.text();
        } else {
          content = await fileToBase64(selectedFile);
        }
      } else {
        fileType = 'text';
        content = textInput;
        fileName = 'input.txt';
      }

      const response = await fetch('/api/projects/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType,
          content,
          fileName,
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

    // PDFを保存する場合はファイルを渡す
    if (saveFile && selectedFile && selectedFile.type === 'application/pdf' && onFileSelect) {
      onFileSelect(selectedFile);
    }

    setShowPreview(false);
    setSelectedFile(null);
    setTextInput('');
    setResult(null);
    setSaveFile(false);
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

  const canAnalyze =
    (inputMode === 'file' && selectedFile) ||
    (inputMode === 'text' && textInput.trim());

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
          AIで現場情報を自動入力
        </h3>
      </div>

      <p className="text-xs text-blue-700 mb-4">
        ファイルまたはテキストを入力すると、AIが内容を解析してフォームに自動入力します。
      </p>

      {/* 入力モード切替タブ */}
      <div className="flex space-x-1 mb-4 bg-blue-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setInputMode('file')}
          className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            inputMode === 'file'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-blue-600 hover:bg-blue-50'
          }`}
        >
          <Upload className="h-4 w-4" />
          <span>ファイル</span>
        </button>
        <button
          type="button"
          onClick={() => setInputMode('text')}
          className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            inputMode === 'text'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-blue-600 hover:bg-blue-50'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>テキスト入力</span>
        </button>
      </div>

      {/* ファイル選択モード */}
      {inputMode === 'file' && (
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
        </div>
      )}

      {/* テキスト入力モード */}
      {inputMode === 'text' && (
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="ヒアリング内容や要件定義をここに入力してください..."
          className="w-full h-32 px-3 py-2 text-sm border border-blue-200 rounded-md bg-white placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      )}

      {/* 解析ボタン */}
      <div className="mt-3">
        <Button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !canAnalyze}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              解析中...
            </>
          ) : (
            'AIで解析する'
          )}
        </Button>
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

            {/* PDF保存オプション */}
            {showSaveOption && selectedFile?.type === 'application/pdf' && (
              <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveFile}
                    onChange={(e) => setSaveFile(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-blue-900">
                    このPDFを現場のドキュメントとして保存する
                  </span>
                </label>
                <p className="mt-1 ml-7 text-xs text-blue-700">
                  保存すると現場詳細画面からいつでも参照できます
                </p>
              </div>
            )}

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
