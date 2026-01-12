'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Loader2,
  Check,
  X,
  FileText,
  Camera,
  Wand2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Project, ProjectTag, ProjectStatus } from '@/types/database';
import type {
  IntegrationResponse,
  ProjectFieldsToIntegrate,
  InfoSource,
} from '@/types/info-integration';

interface InfoIntegratorProps {
  projectId: string;
  currentProject: Project;
  onUpdate: (updatedData: Partial<Project>) => Promise<void>;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: '計画中',
  in_progress: '施工中',
  completed: '完了',
};

const FIELD_LABELS_MAP: Record<keyof ProjectFieldsToIntegrate, string> = {
  name: '工事名',
  client_name: '施主名',
  address: '施工場所',
  tags: 'タグ',
  status: 'ステータス',
  start_date: '開始日',
  end_date: '完了日',
  description: '管理用メモ',
  public_description: '公開用概要',
};

const SOURCE_ICONS = {
  photo: Camera,
  document: FileText,
  generated: Wand2,
};

const SOURCE_LABELS = {
  photo: '写真から推測',
  document: 'ドキュメントから抽出',
  generated: 'AI生成',
};

function formatValue(
  key: keyof ProjectFieldsToIntegrate,
  value: string | string[] | ProjectTag[] | ProjectStatus | null
): string {
  if (value === null || value === undefined) {
    return '（未設定）';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join('、') : '（未設定）';
  }

  if (key === 'status') {
    return STATUS_LABELS[value as ProjectStatus] || value;
  }

  return value;
}

function isEmpty(value: string | string[] | ProjectTag[] | ProjectStatus | null): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

export function InfoIntegrator({
  projectId,
  currentProject: _currentProject,
  onUpdate,
}: InfoIntegratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [integrationResult, setIntegrationResult] = useState<IntegrationResponse | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const handleIntegrate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/integrate-info`, {
        method: 'POST',
      });

      const data: IntegrationResponse = await response.json();

      if (!data.success) {
        setError(data.error || '情報の統合に失敗しました');
        return;
      }

      setIntegrationResult(data);

      // デフォルトの選択状態を設定
      // 現在値が空の項目はデフォルトでON
      const defaultSelection: Record<string, boolean> = {};
      const fields = Object.keys(data.suggestedData) as (keyof ProjectFieldsToIntegrate)[];

      for (const field of fields) {
        const currentValue = data.currentData[field];
        const suggestedValue = data.suggestedData[field];

        // 推測値がある場合のみ選択肢として表示
        if (!isEmpty(suggestedValue)) {
          // 現在値が空なら自動選択
          defaultSelection[field] = isEmpty(currentValue);
        }
      }

      setSelectedFields(defaultSelection);
      setShowModal(true);
    } catch (err) {
      console.error('Integration error:', err);
      setError(err instanceof Error ? err.message : '情報の統合に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!integrationResult) return;

    setIsUpdating(true);

    try {
      const updateData: Partial<Project> = {};

      for (const [field, isSelected] of Object.entries(selectedFields)) {
        if (isSelected) {
          const key = field as keyof ProjectFieldsToIntegrate;
          const value = integrationResult.suggestedData[key];

          if (value !== null && value !== undefined) {
            (updateData as Record<string, unknown>)[key] = value;
          }
        }
      }

      if (Object.keys(updateData).length > 0) {
        await onUpdate(updateData);
      }

      setShowModal(false);
      setIntegrationResult(null);
      setSelectedFields({});
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const getSourceInfo = (field: keyof ProjectFieldsToIntegrate): InfoSource | null => {
    if (!integrationResult) return null;
    return integrationResult.sources.find((s) => s.field === field) || null;
  };

  const hasChanges = Object.values(selectedFields).some((v) => v);

  const fieldsWithSuggestions = integrationResult
    ? (Object.keys(integrationResult.suggestedData) as (keyof ProjectFieldsToIntegrate)[]).filter(
        (field) => !isEmpty(integrationResult.suggestedData[field])
      )
    : [];

  return (
    <>
      <Button
        onClick={handleIntegrate}
        disabled={isLoading}
        className="bg-purple-600 hover:bg-purple-700 text-white"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            分析中...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            情報を統合して更新
          </>
        )}
      </Button>

      {error && !showModal && (
        <div className="mt-2 flex items-center text-sm text-red-600">
          <AlertCircle className="mr-1 h-4 w-4" />
          {error}
        </div>
      )}

      {showModal && integrationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 bg-purple-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-medium text-gray-900">
                    情報の統合
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                採用する項目にチェックを入れてください。空欄の項目は自動でチェックされています。
              </p>
            </div>

            <div className="overflow-y-auto max-h-[60vh] px-6 py-4">
              {fieldsWithSuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2">新しい情報はありませんでした</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fieldsWithSuggestions.map((field) => {
                    const sourceInfo = getSourceInfo(field);
                    const SourceIcon = sourceInfo
                      ? SOURCE_ICONS[sourceInfo.source]
                      : null;
                    const isExpanded = expandedField === field;
                    const currentValue = integrationResult.currentData[field];
                    const suggestedValue = integrationResult.suggestedData[field];

                    return (
                      <div
                        key={field}
                        className={`rounded-lg border ${
                          selectedFields[field]
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div
                          className="flex items-start p-4 cursor-pointer"
                          onClick={() => toggleField(field)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFields[field] || false}
                            onChange={() => toggleField(field)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">
                                {FIELD_LABELS_MAP[field]}
                              </span>
                              {sourceInfo && SourceIcon && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <SourceIcon className="mr-1 h-3 w-3" />
                                  {SOURCE_LABELS[sourceInfo.source]}
                                  <span className="ml-1 text-purple-600">
                                    ({Math.round(sourceInfo.confidence * 100)}%)
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500 block">現在の値:</span>
                                <span className={`${isEmpty(currentValue) ? 'text-gray-400 italic' : 'text-gray-700'}`}>
                                  {formatValue(field, currentValue)}
                                </span>
                              </div>
                              <div>
                                <span className="text-purple-600 block">推測値:</span>
                                <span className="text-gray-900 font-medium">
                                  {formatValue(field, suggestedValue)}
                                </span>
                              </div>
                            </div>

                            {sourceInfo && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedField(isExpanded ? null : field);
                                }}
                                className="mt-2 flex items-center text-xs text-gray-500 hover:text-gray-700"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                )}
                                詳細を{isExpanded ? '閉じる' : '表示'}
                              </button>
                            )}
                          </div>
                        </div>

                        {isExpanded && sourceInfo && (
                          <div className="px-4 pb-4 ml-7">
                            <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
                              {sourceInfo.reason}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                }}
                disabled={isUpdating}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={isUpdating || !hasChanges}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    選択した項目を更新
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
