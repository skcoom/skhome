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
} from 'lucide-react';
import type { Project, ProjectMedia } from '@/types/database';

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
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<ProjectMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<'before' | 'during' | 'after'>('before');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // デモ用のダミーデータ
  useEffect(() => {
    // Supabase設定後に実際のデータ取得に置き換え
    setProject({
      id: params.id as string,
      name: '大橋邸 リフォーム工事',
      client_name: '大橋様',
      address: '東京都世田谷区',
      category: 'remodeling',
      status: 'completed',
      start_date: '2022-04-01',
      end_date: '2022-04-30',
      description: 'キッチン・浴室のリフォーム工事。お客様のご要望に合わせて、最新の設備を導入しました。',
      is_public: true,
      created_by: '1',
      created_at: '2022-03-15',
      updated_at: '2022-04-30',
    });

    setMedia([
      {
        id: '1',
        project_id: params.id as string,
        type: 'image',
        phase: 'before',
        file_url: '/placeholder-before.jpg',
        thumbnail_url: '/placeholder-before.jpg',
        caption: 'リフォーム前のキッチン',
        uploaded_by: '1',
        is_featured: true,
        created_at: '2022-04-07',
      },
      {
        id: '2',
        project_id: params.id as string,
        type: 'image',
        phase: 'after',
        file_url: '/placeholder-after.jpg',
        thumbnail_url: '/placeholder-after.jpg',
        caption: 'リフォーム後のキッチン',
        uploaded_by: '1',
        is_featured: true,
        created_at: '2022-04-20',
      },
    ]);
  }, [params.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${params.id}/${Date.now()}.${fileExt}`;

        // Supabase Storageにアップロード
        const { error: uploadError } = await supabase.storage
          .from('project-media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // 公開URLを取得
        const { data: publicUrlData } = supabase.storage
          .from('project-media')
          .getPublicUrl(fileName);

        // メディアレコードを作成（Supabase設定後に有効化）
        // const isVideo = file.type.startsWith('video/');
        // await supabase.from('project_media').insert([
        //   {
        //     project_id: params.id,
        //     type: isVideo ? 'video' : 'image',
        //     phase: selectedPhase,
        //     file_url: publicUrlData.publicUrl,
        //     is_featured: false,
        //   },
        // ]);
        console.log('File uploaded:', publicUrlData.publicUrl);
      }

      // メディア一覧を再取得
      // const { data } = await supabase
      //   .from('project_media')
      //   .select('*')
      //   .eq('project_id', params.id)
      //   .order('created_at', { ascending: false });
      // setMedia(data || []);

      setShowUploadModal(false);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const togglePublic = async () => {
    if (!project) return;

    const newIsPublic = !project.is_public;
    // await supabase
    //   .from('projects')
    //   .update({ is_public: newIsPublic })
    //   .eq('id', project.id);

    setProject({ ...project, is_public: newIsPublic });
  };

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
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

      {/* Media section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">施工写真・動画</h2>
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
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Video className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                {item.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                    <p className="truncate text-xs text-white">{item.caption}</p>
                  </div>
                )}
                {item.is_featured && (
                  <div className="absolute top-2 right-2">
                    <span className="rounded bg-yellow-500 px-2 py-0.5 text-xs font-medium text-white">
                      HP掲載
                    </span>
                  </div>
                )}
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

              {isUploading && (
                <div className="text-center">
                  <p className="text-sm text-gray-500">アップロード中...</p>
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
