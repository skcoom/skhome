'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Edit,
  Upload,
  Image as ImageIcon,
  Video,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Star,
  Globe,
  Lock,
  ExternalLink,
  Trash2,
  Play,
} from 'lucide-react';
import type { Project, ProjectMedia, MediaType, MediaPhase } from '@/types/database';
import { PickupSuggestions } from '@/components/admin/PickupSuggestions';

const statusLabels = {
  planning: { label: '計画中', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: '施工中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '完了', color: 'bg-green-100 text-green-800' },
};

const categoryLabels = {
  apartment: 'マンション',
  remodeling: 'リフォーム',
  new_construction: '新築',
  house: '住宅',
};

const phaseLabels = {
  before: '施工前',
  during: '施工中',
  after: '施工後',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<ProjectMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<'before' | 'during' | 'after'>('before');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // アップロード進捗管理
  const [uploadProgress, setUploadProgress] = useState({
    currentFile: 0,
    totalFiles: 0,
    currentFileName: '',
    startTime: 0,
    uploadedFiles: [] as string[],
    failedFiles: [] as { name: string; error: string }[],
  });
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabaseからプロジェクトとメディアデータを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // プロジェクト情報を取得
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) {
          throw new Error('プロジェクトの取得に失敗しました');
        }

        setProject(projectData);

        // メディア情報を取得
        const { data: mediaData, error: mediaError } = await supabase
          .from('project_media')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (mediaError) {
          console.error('Media fetch error:', mediaError);
        }

        setMedia(mediaData || []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId, supabase]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({
      currentFile: 0,
      totalFiles: fileArray.length,
      currentFileName: '',
      startTime: Date.now(),
      uploadedFiles: [],
      failedFiles: [],
    });

    const uploadedFiles: string[] = [];
    const failedFiles: { name: string; error: string }[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const mediaType: MediaType = file.type.startsWith('video/') ? 'video' : 'image';

        setUploadProgress((prev) => ({
          ...prev,
          currentFile: i + 1,
          currentFileName: file.name,
        }));

        let fileUrl: string;
        let thumbnailUrl: string | undefined;

        try {
          if (mediaType === 'image') {
            // 画像の場合：処理APIでリサイズ・WebP変換
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', projectId);

            const response = await fetch('/api/media/process', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || '画像処理に失敗しました');
            }

            const result = await response.json();
            fileUrl = result.file_url;
            thumbnailUrl = result.thumbnail_url;
          } else {
            // 動画の場合：従来通り直接アップロード
            const fileExt = file.name.split('.').pop();
            const fileName = `${projectId}/${Date.now()}.${fileExt}`;

            const { error: storageError } = await supabase.storage
              .from('project-media')
              .upload(fileName, file);

            if (storageError) {
              throw new Error(storageError.message || '動画アップロードに失敗しました');
            }

            const { data: publicUrlData } = supabase.storage
              .from('project-media')
              .getPublicUrl(fileName);

            fileUrl = publicUrlData.publicUrl;
          }

          // メディアレコードを作成
          const insertData = {
            project_id: projectId,
            type: mediaType,
            phase: selectedPhase as MediaPhase,
            file_url: fileUrl,
            thumbnail_url: thumbnailUrl,
            is_featured: false,
          };
          const { error: insertError } = await supabase
            .from('project_media')
            .insert(insertData as never);

          if (insertError) {
            throw new Error(insertError.message || 'データベース登録に失敗しました');
          }

          uploadedFiles.push(file.name);
          setUploadProgress((prev) => ({
            ...prev,
            uploadedFiles: [...prev.uploadedFiles, file.name],
          }));
        } catch (fileError) {
          const errorMessage = fileError instanceof Error ? fileError.message : '不明なエラー';
          failedFiles.push({ name: file.name, error: errorMessage });
          setUploadProgress((prev) => ({
            ...prev,
            failedFiles: [...prev.failedFiles, { name: file.name, error: errorMessage }],
          }));
        }
      }

      // メディア一覧を再取得
      const { data } = await supabase
        .from('project_media')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      setMedia(data || []);

      // 結果に応じてモーダルを閉じるか、エラー表示
      if (failedFiles.length === 0) {
        setShowUploadModal(false);
      } else if (failedFiles.length === fileArray.length) {
        setUploadError('すべてのファイルのアップロードに失敗しました');
      } else {
        setUploadError(`${failedFiles.length}件のファイルがアップロードに失敗しました`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const togglePublic = async () => {
    if (!project) return;

    const newIsPublic = !project.is_public;
    const { error: updateError } = await supabase
      .from('projects')
      .update({ is_public: newIsPublic } as never)
      .eq('id', project.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return;
    }

    setProject({ ...project, is_public: newIsPublic });
  };

  const toggleFeatured = async (mediaId: string, currentFeatured: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaIds: [mediaId],
          is_featured: !currentFeatured,
        }),
      });

      if (!response.ok) {
        throw new Error('更新に失敗しました');
      }

      // ローカルstateを更新
      setMedia((prev) =>
        prev.map((m) =>
          m.id === mediaId ? { ...m, is_featured: !currentFeatured } : m
        )
      );
    } catch (err) {
      console.error('Toggle featured error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="text-red-500 mb-4">{error || 'プロジェクトが見つかりません'}</div>
        <Link href="/projects">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Link
            href="/projects"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                {categoryLabels[project.category]}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusLabels[project.status].color}`}>
                {statusLabels[project.status].label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={togglePublic}>
            {project.is_public ? (
              <>
                <Eye className="mr-2 h-4 w-4" />
                公開中
              </>
            ) : (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                非公開
              </>
            )}
          </Button>
          <Link href={`/projects/${project.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              編集
            </Button>
          </Link>
        </div>
      </div>

      {/* Project info */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {project.client_name && (
            <div>
              <p className="text-sm font-medium text-gray-500">施主名</p>
              <p className="mt-1 text-gray-900">{project.client_name} 様</p>
            </div>
          )}
          {project.address && (
            <div>
              <p className="text-sm font-medium text-gray-500">施工場所</p>
              <p className="mt-1 flex items-center text-gray-900">
                <MapPin className="mr-1 h-4 w-4 text-gray-400" />
                {project.address}
              </p>
            </div>
          )}
          {project.start_date && (
            <div>
              <p className="text-sm font-medium text-gray-500">工期</p>
              <p className="mt-1 flex items-center text-gray-900">
                <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                {project.start_date}
                {project.end_date && ` 〜 ${project.end_date}`}
              </p>
            </div>
          )}
        </div>
        {project.description && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">工事概要</p>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">{project.description}</p>
          </div>
        )}
      </div>

      {/* Publishing settings section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-medium text-gray-900">公開設定</h2>
          </div>
          {project.is_public && (
            <a
              href={`/works/${project.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-sm text-blue-600 hover:underline"
            >
              公開ページを確認
              <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          )}
        </div>

        <div className="space-y-4">
          {/* 公開ステータス */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-3">
              {project.is_public ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Globe className="h-5 w-5 text-green-600" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {project.is_public ? '公開中' : '非公開'}
                </p>
                <p className="text-sm text-gray-500">
                  {project.is_public
                    ? 'この現場はホームページに表示されています'
                    : 'この現場はホームページに表示されていません'}
                </p>
              </div>
            </div>
            <Button
              variant={project.is_public ? 'outline' : 'default'}
              onClick={togglePublic}
            >
              {project.is_public ? '非公開にする' : '公開する'}
            </Button>
          </div>

          {/* HP掲載写真の状況 */}
          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-gray-900">HP掲載写真</span>
              </div>
              <span className="text-sm text-gray-600">
                {media.filter((m) => m.is_featured).length} 枚選択中
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              HP掲載に設定した写真がサムネイルや施工実績ページに表示されます
            </p>
            <div className="flex flex-wrap gap-2">
              {media.filter((m) => m.is_featured).length === 0 ? (
                <p className="text-sm text-orange-600">
                  ※ 下の写真をホバーして「HP掲載に設定」を選択してください
                </p>
              ) : (
                media
                  .filter((m) => m.is_featured)
                  .slice(0, 6)
                  .map((m) => (
                    <div key={m.id} className="h-12 w-12 rounded overflow-hidden">
                      <img
                        src={m.thumbnail_url || m.file_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))
              )}
              {media.filter((m) => m.is_featured).length > 6 && (
                <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center text-sm text-gray-600">
                  +{media.filter((m) => m.is_featured).length - 6}
                </div>
              )}
            </div>
          </div>

          {/* ファーストビュー設定へのリンク */}
          <div className="p-4 rounded-lg border border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">トップページのファーストビュー</p>
                <p className="text-sm text-gray-600">
                  この現場の写真をトップページのメイン画像に設定できます
                </p>
              </div>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  ダッシュボードで設定
                  <ExternalLink className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Media section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">施工写真・動画</h2>
            <p className="text-sm text-gray-500">
              写真をホバーしてHP掲載に設定できます
            </p>
          </div>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            アップロード
          </Button>
        </div>

        {/* Phase tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {(['before', 'during', 'after'] as const).map((phase) => {
              const count = media.filter((m) => m.phase === phase).length;
              return (
                <button
                  key={phase}
                  onClick={() => setSelectedPhase(phase)}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                    selectedPhase === phase
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {phaseLabels[phase]}
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Media grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {media
            .filter((m) => m.phase === selectedPhase)
            .map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
              >
                {item.type === 'image' ? (
                  item.file_url ? (
                    <img
                      src={item.thumbnail_url || item.file_url}
                      alt={item.caption || '施工写真'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )
                ) : (
                  item.file_url ? (
                    <video
                      src={item.file_url}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Video className="h-12 w-12 text-gray-400" />
                    </div>
                  )
                )}
                {item.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                    <p className="truncate text-xs text-white">{item.caption}</p>
                  </div>
                )}
                {/* HP掲載バッジ */}
                {item.is_featured && (
                  <div className="absolute top-2 right-2">
                    <span className="rounded bg-yellow-500 px-2 py-0.5 text-xs font-medium text-white flex items-center">
                      <Star className="h-3 w-3 mr-1" />
                      HP掲載
                    </span>
                  </div>
                )}
                {/* ホバー時のHP掲載トグルボタン */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => toggleFeatured(item.id, item.is_featured)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.is_featured
                        ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                    }`}
                  >
                    {item.is_featured ? (
                      <>
                        <Star className="h-4 w-4 inline mr-1" />
                        HP掲載解除
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 inline mr-1" />
                        HP掲載に設定
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}

          {/* Upload placeholder */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="text-center">
              <Plus className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">追加</p>
            </div>
          </button>
        </div>

        {/* Empty state */}
        {media.filter((m) => m.phase === selectedPhase).length === 0 && (
          <div className="text-center py-8">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              {phaseLabels[selectedPhase]}の写真・動画がありません
            </p>
          </div>
        )}
      </div>

      {/* AI Pickup Suggestions */}
      <PickupSuggestions
        projectId={projectId}
        onApproved={async () => {
          // メディア一覧を再取得
          const { data } = await supabase
            .from('project_media')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
          setMedia(data || []);
        }}
      />

      {/* Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              写真・動画をアップロード
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  フェーズ
                </label>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value as 'before' | 'during' | 'after')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="before">施工前</option>
                  <option value="during">施工中</option>
                  <option value="after">施工後</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ファイルを選択
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="w-full"
                />
              </div>

              {isUploading && uploadProgress.totalFiles > 0 && (
                <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-900 font-medium">
                      {uploadProgress.currentFile} / {uploadProgress.totalFiles} 件
                    </span>
                    <span className="text-blue-700">
                      {Math.round((uploadProgress.currentFile / uploadProgress.totalFiles) * 100)}%
                    </span>
                  </div>

                  {/* プログレスバー */}
                  <div className="h-2 w-full rounded-full bg-blue-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300 ease-out"
                      style={{
                        width: `${(uploadProgress.currentFile / uploadProgress.totalFiles) * 100}%`,
                      }}
                    />
                  </div>

                  {/* 現在処理中のファイル名 */}
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="truncate">{uploadProgress.currentFileName}</span>
                  </div>

                  {/* 残り時間推定 */}
                  {uploadProgress.currentFile > 0 && (
                    <div className="text-xs text-blue-600">
                      {(() => {
                        const elapsed = Date.now() - uploadProgress.startTime;
                        const avgTimePerFile = elapsed / uploadProgress.currentFile;
                        const remainingFiles = uploadProgress.totalFiles - uploadProgress.currentFile;
                        const estimatedRemaining = Math.ceil((avgTimePerFile * remainingFiles) / 1000);
                        if (estimatedRemaining < 60) {
                          return `残り約 ${estimatedRemaining} 秒`;
                        }
                        return `残り約 ${Math.ceil(estimatedRemaining / 60)} 分`;
                      })()}
                    </div>
                  )}

                  {/* 完了したファイル */}
                  {uploadProgress.uploadedFiles.length > 0 && (
                    <div className="max-h-20 overflow-y-auto text-xs">
                      {uploadProgress.uploadedFiles.map((name) => (
                        <div key={name} className="flex items-center space-x-1 text-green-700">
                          <CheckCircle className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* エラー表示 */}
              {uploadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center space-x-2 text-red-800 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{uploadError}</span>
                  </div>
                  {uploadProgress.failedFiles.length > 0 && (
                    <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                      {uploadProgress.failedFiles.map(({ name, error: err }) => (
                        <div key={name} className="flex items-start space-x-1 text-red-700">
                          <XCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span>
                            <span className="font-medium">{name}</span>: {err}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
