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
  Sparkles,
  Images,
} from 'lucide-react';
import type { Project, ProjectMedia, MediaType, MediaPhase, PendingClassificationFile, UserRole } from '@/types/database';
import { PickupSuggestions } from '@/components/admin/pickup-suggestions';
import { DocumentManager } from '@/components/admin/document-manager';
import { PhotoClassifier } from '@/components/admin/photo-classifier';
import { InfoIntegrator } from '@/components/admin/info-integrator';
import { BeforeAfterPairing } from '@/components/admin/before-after-pairing';
import { ProjectMembersManager } from '@/components/admin/project-members-manager';
import {
  MEDIA_SIGNED_URL_TTL_SECONDS,
  PRIVATE_MEDIA_BUCKET,
  internalMediaUrl,
} from '@/lib/media-storage';

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

async function fetchProjectMedia(projectId: string): Promise<ProjectMedia[]> {
  const response = await fetch(`/api/projects/${projectId}/media`, { cache: 'no-store' });
  if (!response.ok) throw new Error('写真の取得に失敗しました');
  return response.json();
}

// クライアントサイドで動画からサムネイルを生成
async function generateVideoThumbnail(file: File): Promise<Blob | null> {
  console.log('[Thumbnail] Starting generation for:', file.name, 'size:', file.size, 'type:', file.type);

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('[Thumbnail] Canvas context not available');
      resolve(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    console.log('[Thumbnail] Created object URL');

    // クリーンアップ
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.src = '';
      video.load();
    };

    // タイムアウト設定（15秒）
    const timeout = setTimeout(() => {
      console.error('[Thumbnail] Generation timed out');
      cleanup();
      resolve(null);
    }, 15000);

    // video要素の設定（DOMには追加しない - Chromeのセキュリティチェック回避）
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      console.log('[Thumbnail] Metadata loaded. Duration:', video.duration, 'Size:', video.videoWidth, 'x', video.videoHeight);

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('[Thumbnail] Video dimensions are 0');
        clearTimeout(timeout);
        cleanup();
        resolve(null);
        return;
      }

      // シーク位置を設定（0.1秒または動画長の10%の小さい方）
      const seekTime = Math.max(0.1, Math.min(0.5, video.duration * 0.1));
      console.log('[Thumbnail] Seeking to:', seekTime);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      console.log('[Thumbnail] Seeked to:', video.currentTime);
      clearTimeout(timeout);

      // 少し待ってからキャプチャ（フレームのレンダリング待ち）
      requestAnimationFrame(() => {
        try {
          const maxWidth = 640;
          const scale = Math.min(1, maxWidth / video.videoWidth);
          canvas.width = Math.floor(video.videoWidth * scale);
          canvas.height = Math.floor(video.videoHeight * scale);

          console.log('[Thumbnail] Canvas size:', canvas.width, 'x', canvas.height);

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          console.log('[Thumbnail] Drew frame to canvas');

          canvas.toBlob(
            (blob) => {
              cleanup();
              if (blob && blob.size > 1000) {
                console.log('[Thumbnail] Generated blob, size:', blob.size);
                resolve(blob);
              } else {
                console.error('[Thumbnail] Blob too small or null:', blob?.size);
                resolve(null);
              }
            },
            'image/jpeg',
            0.8
          );
        } catch (err) {
          console.error('[Thumbnail] Error drawing to canvas:', err);
          cleanup();
          resolve(null);
        }
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      const err = video.error;
      console.error('[Thumbnail] Video error - code:', err?.code, 'message:', err?.message);
      cleanup();
      resolve(null);
    };

    video.src = objectUrl;
  });
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<ProjectMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<'before' | 'during' | 'after' | 'ba_pairs'>('before');
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
  const [canEdit, setCanEdit] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // 動画再生モーダル
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  // AI分類機能
  const [useAIClassification, setUseAIClassification] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingClassificationFile[]>([]);
  const [showClassifier, setShowClassifier] = useState(false);

  // Supabaseからプロジェクトとメディアデータを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .or(`id.eq.${authData.user.id},auth_user_id.eq.${authData.user.id}`)
            .single();
          const profileRole = (profile as { role?: string } | null)?.role;
          if (profileRole === 'admin' || profileRole === 'staff' || profileRole === 'partner') {
            setUserRole(profileRole);
          }
          setCanEdit(profileRole === 'admin' || profileRole === 'staff');
        }

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
        setMedia(await fetchProjectMedia(projectId));
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

  // 1ファイルをアップロードする関数（AI分類モード対応）
  const uploadSingleFile = async (
    file: File,
    onSuccess: (name: string, pendingFile?: PendingClassificationFile) => void,
    onError: (name: string, error: string) => void,
    skipDbInsert: boolean = false
  ): Promise<void> => {
    const mediaType: MediaType = file.type.startsWith('video/') ? 'video' : 'image';
    let fileUrl: string;
    let thumbnailUrl: string | undefined;
    let privateStoragePath: string | undefined;
    let privateThumbnailPath: string | undefined;
    let privateLargePath: string | undefined;
    const uploadedStoragePaths: string[] = [];

    try {
      if (mediaType === 'image' && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024)) {
        throw new Error('画像はJPEG・PNG・WebP形式、20MB以下にしてください');
      }
      if (mediaType === 'video' && (!['video/mp4', 'video/webm'].includes(file.type) || file.size > 50 * 1024 * 1024)) {
        throw new Error('動画はMP4・WebM形式、50MB以下にしてください');
      }

      if (mediaType === 'image') {
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
        privateStoragePath = result.storage_path;
        privateThumbnailPath = result.thumbnail_storage_path;
        privateLargePath = result.large_storage_path;
        uploadedStoragePaths.push(
          ...Object.values(result.images || {})
            .map((image) => (image as { path?: string }).path)
            .filter((path): path is string => Boolean(path)),
        );
      } else {
        // 動画: クライアントから直接Supabaseにアップロード（Vercelの4.5MB制限回避）
        console.log('[Upload] Starting video upload for:', file.name);

        // サムネイル生成を試行
        const thumbnailBlob = await generateVideoThumbnail(file);
        console.log('[Upload] Thumbnail generation result:', thumbnailBlob ? `Blob size: ${thumbnailBlob.size}` : 'null');

        const timestamp = Date.now();
        const randomStr = crypto.randomUUID().slice(0, 8);
        const fileExt = file.type === 'video/webm' ? 'webm' : 'mp4';

        // 動画を直接Supabase Storageにアップロード
        const videoFileName = `${projectId}/${timestamp}_${randomStr}.${fileExt}`;
        const { error: videoUploadError } = await supabase.storage
          .from(PRIVATE_MEDIA_BUCKET)
          .upload(videoFileName, file, {
            contentType: file.type,
          });

        if (videoUploadError) {
          throw new Error(`動画アップロードに失敗しました: ${videoUploadError.message}`);
        }
        uploadedStoragePaths.push(videoFileName);

        const { data: videoUrlData, error: videoUrlError } = await supabase.storage
          .from(PRIVATE_MEDIA_BUCKET)
          .createSignedUrl(videoFileName, MEDIA_SIGNED_URL_TTL_SECONDS);
        if (videoUrlError) throw videoUrlError;
        fileUrl = videoUrlData.signedUrl;
        privateStoragePath = videoFileName;

        // サムネイルをアップロード（生成成功した場合）
        if (thumbnailBlob && thumbnailBlob.size > 1000) {
          const thumbFileName = `${projectId}/${timestamp}_${randomStr}_thumb.jpg`;
          const { error: thumbUploadError } = await supabase.storage
            .from(PRIVATE_MEDIA_BUCKET)
            .upload(thumbFileName, thumbnailBlob, {
              contentType: 'image/jpeg',
            });

          if (!thumbUploadError) {
            uploadedStoragePaths.push(thumbFileName);
            const { data: thumbUrlData, error: thumbUrlError } = await supabase.storage
              .from(PRIVATE_MEDIA_BUCKET)
              .createSignedUrl(thumbFileName, MEDIA_SIGNED_URL_TTL_SECONDS);
            if (thumbUrlError) throw thumbUrlError;
            thumbnailUrl = thumbUrlData.signedUrl;
            privateThumbnailPath = thumbFileName;
          } else {
            console.warn('[Upload] Thumbnail upload failed:', thumbUploadError);
          }
        } else {
          console.warn('[Upload] No valid thumbnail to upload');
        }
      }

      // AI分類モードの場合はDB登録をスキップ
      if (skipDbInsert) {
        const pendingFile: PendingClassificationFile = {
          tempId: `${Date.now()}_${file.name}`,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl,
          type: mediaType,
          storage_paths: uploadedStoragePaths,
          private_storage_path: privateStoragePath,
          private_thumbnail_path: privateThumbnailPath,
          private_large_path: privateLargePath,
        };
        onSuccess(file.name, pendingFile);
        return;
      }

      const insertData = {
        project_id: projectId,
        type: mediaType,
        phase: selectedPhase as MediaPhase,
        file_url: privateStoragePath ? internalMediaUrl(privateStoragePath) : fileUrl,
        thumbnail_url: privateThumbnailPath ? internalMediaUrl(privateThumbnailPath) : thumbnailUrl,
        private_storage_bucket: privateStoragePath ? PRIVATE_MEDIA_BUCKET : null,
        private_storage_path: privateStoragePath || null,
        private_thumbnail_path: privateThumbnailPath || null,
        private_large_path: privateLargePath || null,
        // 新しい写真は必ず「社内のみ」から始め、人が確認してから掲載する。
        is_featured: true,
        source_origin: 'manual',
        publication_status: 'internal',
      };
      const { error: insertError } = await supabase
        .from('project_media')
        .insert(insertData as never);

      if (insertError) {
        throw new Error(insertError.message || 'データベース登録に失敗しました');
      }

      onSuccess(file.name);
    } catch (fileError) {
      if (uploadedStoragePaths.length > 0) {
        await supabase.storage.from(PRIVATE_MEDIA_BUCKET).remove(uploadedStoragePaths);
      }
      const errorMessage = fileError instanceof Error ? fileError.message : '不明なエラー';
      onError(file.name, errorMessage);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const CONCURRENT_UPLOADS = 2; // 同時アップロード数を制限

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

    let completedCount = 0;
    const uploadedFileNames: string[] = [];
    const failedFilesList: { name: string; error: string }[] = [];
    const pendingFilesList: PendingClassificationFile[] = [];

    const updateProgress = (fileName: string) => {
      completedCount++;
      setUploadProgress((prev) => ({
        ...prev,
        currentFile: completedCount,
        currentFileName: fileName,
      }));
    };

    const onSuccess = (name: string, pendingFile?: PendingClassificationFile) => {
      uploadedFileNames.push(name);
      if (pendingFile) {
        pendingFilesList.push(pendingFile);
      }
      updateProgress(name);
      setUploadProgress((prev) => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, name],
      }));
    };

    const onError = (name: string, error: string) => {
      failedFilesList.push({ name, error });
      updateProgress(name);
      setUploadProgress((prev) => ({
        ...prev,
        failedFiles: [...prev.failedFiles, { name, error }],
      }));
    };

    try {
      // ファイルをチャンクに分けて並列処理
      for (let i = 0; i < fileArray.length; i += CONCURRENT_UPLOADS) {
        const chunk = fileArray.slice(i, i + CONCURRENT_UPLOADS);
        await Promise.all(
          chunk.map((file) => uploadSingleFile(file, onSuccess, onError, useAIClassification))
        );
      }

      // AI分類モードの場合
      if (useAIClassification && pendingFilesList.length > 0) {
        setPendingFiles(pendingFilesList);
        setShowUploadModal(false);
        setShowClassifier(true);
        return;
      }

      // 通常モード: メディア一覧を再取得
      setMedia(await fetchProjectMedia(projectId));

      // 結果に応じてモーダルを閉じるか、エラー表示
      if (failedFilesList.length === 0) {
        setShowUploadModal(false);
      } else if (failedFilesList.length === fileArray.length) {
        setUploadError('すべてのファイルのアップロードに失敗しました');
      } else {
        setUploadError(`${failedFilesList.length}件のファイルがアップロードに失敗しました`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
      // inputをリセット
      e.target.value = '';
    }
  };

  // AI分類結果を確定してDBに保存
  const handleClassificationConfirm = async (
    results: { tempId: string; phase: MediaPhase }[]
  ) => {
    try {
      // pendingFilesから該当するファイルを取得してDBに登録
      const insertData = results.map((result) => {
        const file = pendingFiles.find((f) => f.tempId === result.tempId);
        if (!file) return null;

        return {
          project_id: projectId,
          type: file.type,
          phase: result.phase,
          file_url: file.private_storage_path
            ? internalMediaUrl(file.private_storage_path)
            : file.file_url,
          thumbnail_url: file.private_thumbnail_path
            ? internalMediaUrl(file.private_thumbnail_path)
            : file.thumbnail_url,
          private_storage_bucket: file.private_storage_path ? PRIVATE_MEDIA_BUCKET : null,
          private_storage_path: file.private_storage_path || null,
          private_thumbnail_path: file.private_thumbnail_path || null,
          private_large_path: file.private_large_path || null,
          // AIの提案だけで公開せず、一覧から人が明示的に掲載する。
          is_featured: true,
          source_origin: 'manual',
          publication_status: 'internal',
        };
      }).filter((d): d is NonNullable<typeof d> => d !== null);

      if (insertData.length > 0) {
        const { error: insertError } = await supabase
          .from('project_media')
          .insert(insertData as never);

        if (insertError) {
          throw new Error(insertError.message || 'データベース登録に失敗しました');
        }
      }

      // メディア一覧を再取得
      setMedia(await fetchProjectMedia(projectId));

      // 状態をリセット
      setPendingFiles([]);
      setShowClassifier(false);
    } catch (err) {
      console.error('Classification confirm error:', err);
      alert(err instanceof Error ? err.message : '保存に失敗しました');
    }
  };

  // AI分類をキャンセル（アップロード済みファイルは残る）
  const handleClassificationCancel = async () => {
    const storagePaths = pendingFiles.flatMap((file) => file.storage_paths || []);
    if (storagePaths.length > 0) {
      const { error: cleanupError } = await supabase.storage.from(PRIVATE_MEDIA_BUCKET).remove(storagePaths);
      if (cleanupError) {
        console.error('Classification upload cleanup error:', cleanupError);
        alert('アップロードを取り消した写真の削除に失敗しました。管理者に連絡してください');
        return;
      }
    }
    setPendingFiles([]);
    setShowClassifier(false);
  };

  const togglePublic = async () => {
    if (!project) return;

    const newIsPublic = !project.is_public;

    if (newIsPublic) {
      const confirmed = window.confirm(
        `次の内容をホームページに公開します。\n\n案件名：${project.public_title || '未入力'}\n地域：${project.public_location || '未入力'}\n概要：${project.public_description || '未入力'}\n\n施主名・番地を含む住所・管理用メモは公開されません。内容を確認して公開しますか？`,
      );
      if (!confirmed) return;
    }

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_public: newIsPublic,
          confirm_publication: newIsPublic,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Update error:', data.error);
        alert(data.error || '公開設定の変更に失敗しました');
        return;
      }

      setProject({ ...project, is_public: newIsPublic });
    } catch (error) {
      console.error('Update error:', error);
      alert('公開設定の変更に失敗しました');
    }
  };

  const toggleFeatured = async (mediaId: string, currentFeatured: boolean) => {
    if (currentFeatured) {
      const confirmed = window.confirm(
        'この写真をホームページ掲載対象にします。施工実績そのものが公開中の場合は、保存後に写真が表示されます。掲載してよい写真ですか？',
      );
      if (!confirmed) return;
    }

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
          m.id === mediaId ? {
            ...m,
            is_featured: !currentFeatured,
            publication_status: currentFeatured ? 'published' : 'internal',
          } : m
        )
      );
    } catch (err) {
      console.error('Toggle featured error:', err);
    }
  };

  const setMainImage = async (mediaId: string) => {
    if (!project) return;

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ main_media_id: mediaId }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'メイン画像の設定に失敗しました');

      setProject({ ...project, main_media_id: mediaId });
    } catch (err) {
      console.error('Set main image error:', err);
      alert('メイン画像の設定に失敗しました');
    }
  };

  const clearMainImage = async () => {
    if (!project) return;

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ main_media_id: null }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'メイン画像の解除に失敗しました');

      setProject({ ...project, main_media_id: undefined });
    } catch (err) {
      console.error('Clear main image error:', err);
      alert('メイン画像の解除に失敗しました');
    }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!confirm('このメディアを削除しますか？')) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/media?mediaId=${mediaId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      // ローカルstateから削除
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      console.error('Delete media error:', err);
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  // 管理用メモを更新
  const updateDescription = async (description: string) => {
    if (!project) return;

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({ description } as never)
        .eq('id', project.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setProject({ ...project, description });
      alert('管理用メモを更新しました');
    } catch (err) {
      console.error('Description update error:', err);
      alert('管理用メモの更新に失敗しました');
    }
  };

  // 公開用概要を更新
  const updatePublicDescription = async (publicDescription: string) => {
    if (!project) return;

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({ public_description: publicDescription } as never)
        .eq('id', project.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setProject({ ...project, public_description: publicDescription });
      alert('公開用概要を更新しました');
    } catch (err) {
      console.error('Public description update error:', err);
      alert('公開用概要の更新に失敗しました');
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
        <Link href="/admin/projects">
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start space-x-3 sm:space-x-4">
          <Link
            href="/admin/projects"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-gray-900">{project.name}</h1>
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
        {canEdit && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Link href={`/admin/genba?project=${project.id}`}>
            <Button variant="outline">
              <Images className="mr-2 h-4 w-4" />
              LINE写真を確認
            </Button>
          </Link>
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
          <Link href={`/admin/projects/${project.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              編集
            </Button>
          </Link>
        </div>}
      </div>

      {/* Project info */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">基本情報</h2>
          {canEdit && <InfoIntegrator
            projectId={projectId}
            currentProject={project}
            onUpdate={async (updatedData) => {
              const response = await fetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
              });

              if (!response.ok) {
                throw new Error('更新に失敗しました');
              }

              // プロジェクト情報を更新
              setProject({ ...project, ...updatedData });
            }}
          />}
        </div>
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
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center text-blue-600 hover:text-blue-800 hover:underline"
              >
                <MapPin className="mr-1 h-4 w-4" />
                {project.address}
              </a>
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
        {/* 管理用メモ（価格等の詳細情報） */}
        {project.description && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center space-x-2 mb-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">管理用メモ（非公開）</p>
            </div>
            <p className="text-sm text-amber-900 whitespace-pre-wrap">{project.description}</p>
          </div>
        )}

        {/* 公開ページ用概要 */}
        <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <Globe className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-800">公開ページ用概要</p>
          </div>
          {project.public_title || project.public_description ? (
            <div className="space-y-2 text-sm text-green-900">
              <p><span className="font-medium">案件名：</span>{project.public_title || '未設定'}</p>
              <p><span className="font-medium">地域：</span>{project.public_location || '未設定'}</p>
              <p className="whitespace-pre-wrap"><span className="font-medium">概要：</span>{project.public_description || '未設定'}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">未設定（編集画面で公開用の3項目を入力してください）</p>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-medium text-gray-900">施工写真・動画</h2>
          <p className="mt-1 text-sm text-gray-500">担当している現場の記録を閲覧できます。</p>
          {media.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.type === 'video' && setPlayingVideo(item.file_url)}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-left"
                >
                  {item.type === 'image' ? (
                    <img src={item.thumbnail_url || item.file_url} alt={item.caption || ''} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-gray-900 text-white">
                      <Play className="h-10 w-10" />
                    </div>
                  )}
                  <span className="block px-3 py-2 text-xs text-gray-600">{phaseLabels[item.phase]}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">閲覧できる写真・動画はありません。</p>
          )}
        </div>
      )}

      {userRole === 'admin' && <ProjectMembersManager projectId={projectId} />}

      {canEdit && <>

      {/* Document management section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <DocumentManager
          projectId={projectId}
          onDescriptionUpdate={updateDescription}
          onPublicDescriptionUpdate={updatePublicDescription}
        />
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

          {/* 非掲載写真の状況 */}
          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <EyeOff className="h-5 w-5 text-gray-500" />
                <span className="font-medium text-gray-900">非掲載の写真</span>
              </div>
              <span className="text-sm text-gray-600">
                {media.filter((m) => m.is_featured).length} 枚
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              ここにある写真は、施工実績を公開してもホームページには表示されません
            </p>
            <div className="flex flex-wrap gap-2">
              {media.filter((m) => m.is_featured).length === 0 ? (
                <p className="text-sm text-green-600">
                  非掲載に設定した写真はありません
                </p>
              ) : (
                media
                  .filter((m) => m.is_featured)
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleFeatured(m.id, m.is_featured)}
                      className="h-12 w-12 rounded overflow-hidden opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                      title="クリックで掲載する"
                    >
                      <img
                        src={m.thumbnail_url || m.file_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* メイン画像設定 */}
          <div className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-gray-900">メイン画像</span>
              </div>
              {project.main_media_id && (
                <button
                  onClick={clearMainImage}
                  className="text-sm text-red-600 hover:underline"
                >
                  解除
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              施工実績詳細ページのトップに表示される画像です
            </p>
            {project.main_media_id ? (
              <div className="flex items-center space-x-3">
                {(() => {
                  const mainMedia = media.find((m) => m.id === project.main_media_id);
                  if (!mainMedia) return <span className="text-sm text-gray-500">画像が見つかりません</span>;
                  return (
                    <>
                      <div className="h-16 w-16 rounded overflow-hidden">
                        <img
                          src={mainMedia.thumbnail_url || mainMedia.file_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {phaseLabels[mainMedia.phase]}の画像を設定中
                      </span>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-amber-600">
                メイン画像が未設定です。下の写真一覧で設定してください。
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Media section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">施工写真・動画</h2>
            <p className="text-sm text-gray-500">
              管理画面から追加した写真・動画を管理します。追加直後はすべて非掲載です。
            </p>
            <p className="mt-1 text-sm text-amber-700">
              LINEで届いた写真の確認・訂正・公開は、上部の「LINE写真を確認」から行ってください。
            </p>
          </div>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            アップロード
          </Button>
        </div>

        {/* Phase tabs */}
        <div className="mb-6 overflow-x-auto border-b border-gray-200">
          <nav className="-mb-px flex w-max min-w-full space-x-8">
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
            <button
              onClick={() => setSelectedPhase('ba_pairs')}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                selectedPhase === 'ba_pairs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              ビフォーアフター設定
            </button>
          </nav>
        </div>

        {/* Before-After Pairing UI */}
        {selectedPhase === 'ba_pairs' && (
          <BeforeAfterPairing projectId={projectId} media={media} />
        )}

        {/* Media grid */}
        {selectedPhase !== 'ba_pairs' && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {/* Upload placeholder - 最初に配置 */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="text-center">
              <Plus className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">追加</p>
            </div>
          </button>

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
                    <div className="relative h-full w-full">
                      <video
                        src={item.file_url}
                        className="h-full w-full object-cover"
                        muted
                      />
                      {/* 動画プレイアイコン - クリック可能 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayingVideo(item.file_url);
                        }}
                        className="absolute inset-0 flex items-center justify-center z-20 group/play"
                      >
                        <div className="bg-black bg-opacity-50 rounded-full p-3 group-hover/play:bg-opacity-70 transition-all group-hover/play:scale-110">
                          <Play className="h-8 w-8 text-white" />
                        </div>
                      </button>
                    </div>
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
                {/* メイン画像バッジ */}
                {project.main_media_id === item.id && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="rounded bg-yellow-500 px-2 py-0.5 text-xs font-medium text-white flex items-center">
                      <Star className="h-3 w-3 mr-1" />
                      メイン
                    </span>
                  </div>
                )}
                {/* 非掲載バッジ */}
                {item.is_featured && project.main_media_id !== item.id && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="rounded bg-gray-500 px-2 py-0.5 text-xs font-medium text-white flex items-center">
                      <EyeOff className="h-3 w-3 mr-1" />
                      非掲載
                    </span>
                  </div>
                )}
                {/* 削除ボタン（常に表示） */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMedia(item.id);
                  }}
                  className="absolute top-2 left-2 z-30 p-1.5 rounded-full bg-red-500 text-white opacity-100 hover:bg-red-600 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  title="削除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {/* ホバー時の掲載トグルボタン */}
                {item.type === 'image' ? (
                  // 画像の場合：中央に表示
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 opacity-100 transition-all sm:bg-black/0 sm:opacity-0 sm:group-hover:bg-black/40 sm:group-hover:opacity-100">
                    {/* メインに設定ボタン */}
                    {project.main_media_id !== item.id && !item.is_featured && (
                      <button
                        onClick={() => setMainImage(item.id)}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                      >
                        <Star className="h-4 w-4 inline mr-1" />
                        メインに設定
                      </button>
                    )}
                    {/* 掲載トグルボタン */}
                    <button
                      onClick={() => toggleFeatured(item.id, item.is_featured)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        item.is_featured
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      {item.is_featured ? (
                        <>
                          <Eye className="h-4 w-4 inline mr-1" />
                          掲載する
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4 inline mr-1" />
                          掲載しない
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  // 動画の場合：下部に表示（再生ボタンと重ならないように）
                  <div className="absolute bottom-0 left-0 right-0 z-30 p-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFeatured(item.id, item.is_featured);
                      }}
                      className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                        item.is_featured
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      {item.is_featured ? (
                        <>
                          <Eye className="h-3 w-3 inline mr-1" />
                          掲載する
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3 inline mr-1" />
                          掲載しない
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
        )}

        {/* Empty state */}
        {selectedPhase !== 'ba_pairs' && media.filter((m) => m.phase === selectedPhase).length === 0 && (
          <div className="text-center py-8">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              {phaseLabels[selectedPhase as 'before' | 'during' | 'after']}の写真・動画がありません
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
            .is('genba_line_event_id', null)
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
              {/* AI分類オプション */}
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAIClassification}
                    onChange={(e) => setUseAIClassification(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    disabled={isUploading}
                  />
                  <div className="ml-3">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-purple-900">AIで自動分類する</span>
                    </div>
                    <p className="mt-1 text-xs text-purple-700">
                      施工前・施工中・施工後をAIが自動で判定し、ホームページ掲載に適した写真も提案します
                    </p>
                  </div>
                </label>
              </div>

              {/* フェーズ選択（AI分類OFFの場合のみ表示） */}
              {!useAIClassification && (
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
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ファイルを選択
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                    isUploading
                      ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                      : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 cursor-pointer'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isUploading) return;
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const input = document.getElementById('file-upload') as HTMLInputElement;
                      if (input) {
                        const dataTransfer = new DataTransfer();
                        Array.from(files).forEach((file) => dataTransfer.items.add(file));
                        input.files = dataTransfer.files;
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }
                  }}
                  onClick={() => {
                    if (!isUploading) {
                      document.getElementById('file-upload')?.click();
                    }
                  }}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Upload className={`mx-auto h-10 w-10 ${isUploading ? 'text-gray-400' : 'text-blue-500'}`} />
                    <p className={`mt-2 text-sm font-medium ${isUploading ? 'text-gray-500' : 'text-blue-600'}`}>
                      {isUploading ? 'アップロード中...' : 'クリックまたはドラッグ＆ドロップ'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      画像・動画ファイルを選択（複数可）
                    </p>
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      アップロード直後は「社内のみ」です。内容を確認してから「掲載する」を押してください。
                    </p>
                  </div>
                </div>
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
      </>}

      {/* 動画再生モーダル */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="relative max-w-4xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPlayingVideo(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <span className="text-sm">閉じる ✕</span>
            </button>
            <video
              src={playingVideo}
              className="w-full rounded-lg"
              controls
              autoPlay
            >
              <source src={playingVideo} />
            </video>
          </div>
        </div>
      )}

      {/* AI分類モーダル */}
      {canEdit && showClassifier && pendingFiles.length > 0 && (
        <PhotoClassifier
          projectId={projectId}
          files={pendingFiles}
          onConfirm={handleClassificationConfirm}
          onCancel={handleClassificationCancel}
        />
      )}
    </div>
  );
}
