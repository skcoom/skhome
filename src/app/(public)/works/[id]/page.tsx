import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Phone } from 'lucide-react';
import { createPublicClient } from '@/lib/supabase/server';
import type { ProjectMedia, ProjectTag, BeforeAfterPair } from '@/types/database';
import { WorkDetailGallery } from './gallery';
import { DescriptionSection } from './description-section';
import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';
export const revalidate = 300;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createPublicClient();

  const { data: project } = await supabase
    .from('projects')
    .select(`
      public_title,
      public_location,
      public_description,
      tags,
      main_media_id,
      public_reviewed_at,
      project_media!project_media_project_id_fkey (
        id, file_url, thumbnail_url, is_featured, phase, type, publication_status
      )
    `)
    .eq('id', id)
    .eq('is_public', true)
    .not('public_reviewed_at', 'is', null)
    .single();

  if (!project) {
    return {
      title: '施工実績が見つかりません',
    };
  }

  const title = project.public_title || '施工事例';
  const tagsLabel = project.tags?.join('・') || 'リフォーム';
  const description = project.public_description ||
    `${title}の施工実績です。${tagsLabel}工事の詳細をご覧いただけます。`;

  // OG画像を取得
  // 1. main_media_idが設定されていればその画像を優先
  // 2. なければ掲載対象のみ、施工後 > 最初の画像
  const media = (project.project_media || []) as ProjectMedia[];
  const publishedMedia = media.filter(
    (item) => !item.is_featured && item.publication_status === 'published',
  );
  const designatedMainMedia = project.main_media_id
    ? publishedMedia.find((item) => item.id === project.main_media_id)
    : null;
  const afterMedia = publishedMedia.find((m) => m.phase === 'after' && m.type === 'image');
  const firstImage = publishedMedia.find((m) => m.type === 'image');
  const ogImage = designatedMainMedia?.file_url || afterMedia?.file_url || firstImage?.file_url || '/og-image.png';

  return {
    title: `${title} | 施工実績`,
    description,
    alternates: {
      canonical: `/works/${id}`,
    },
    openGraph: {
      title: `${title} | 施工実績`,
      description,
      type: 'article',
      url: `${siteUrl}/works/${id}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | 施工実績`,
      description,
      images: [ogImage],
    },
  };
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createPublicClient();

  // プロジェクト詳細を取得
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id,
      public_title,
      public_location,
      public_description,
      tags,
      start_date,
      end_date,
      main_media_id,
      created_at,
      public_reviewed_at,
      project_media!project_media_project_id_fkey (
        id, project_id, type, phase, file_url, thumbnail_url, caption,
        is_featured, publication_status, created_at
      )
    `)
    .eq('id', id)
    .eq('is_public', true)
    .not('public_reviewed_at', 'is', null)
    .single();

  if (error || !project) {
    notFound();
  }

  const displayTitle = project.public_title || '施工事例';

  // 管理者がログインしたまま公開ページを開いても、公開確定済みの写真だけを表示する。
  const publishedMedia = (project.project_media as ProjectMedia[] | null)?.filter(
    (media) => !media.is_featured && media.publication_status === 'published',
  ) || [];

  // メディアをフェーズごとに分類（画像と動画を含む）
  const mediaByPhase = {
    before: publishedMedia.filter((m) => m.phase === 'before'),
    during: publishedMedia.filter((m) => m.phase === 'during'),
    after: publishedMedia.filter((m) => m.phase === 'after'),
  };

  // ビフォーアフターペアを取得
  const { data: beforeAfterPairs } = await supabase
    .from('before_after_pairs')
    .select(`
      id,
      project_id,
      before_media_id,
      after_media_id,
      display_order,
      label,
      alignment_settings,
      created_at,
      before_media:project_media!before_media_id(
        id, project_id, type, phase, file_url, thumbnail_url, caption,
        is_featured, publication_status, created_at
      ),
      after_media:project_media!after_media_id(
        id, project_id, type, phase, file_url, thumbnail_url, caption,
        is_featured, publication_status, created_at
      )
    `)
    .eq('project_id', id)
    .order('display_order', { ascending: true });

  const typedPairs = ((beforeAfterPairs || []) as unknown as BeforeAfterPair[]).filter(
    (pair) =>
      pair.before_media?.publication_status === 'published' &&
      pair.after_media?.publication_status === 'published' &&
      !pair.before_media?.is_featured &&
      !pair.after_media?.is_featured,
  );

  // メイン画像を取得
  // 1. main_media_idが設定されていればその画像を使用
  // 2. なければフォールバック: 施工後 > 施工中 > 施工前 > 最初の画像
  const designatedMainImage = project.main_media_id
    ? publishedMedia.find((m) => m.id === project.main_media_id)
    : null;
  const afterMedia = mediaByPhase.after[0];
  const duringMedia = mediaByPhase.during[0];
  const beforeMedia = mediaByPhase.before[0];
  const mainImage = designatedMainImage || afterMedia || duringMedia || beforeMedia || publishedMedia.find((m) => m.type === 'image');

  // 関連プロジェクト用の型（表示に必要なフィールドのみ）
  type RelatedProject = {
    id: string;
    public_title: string | null;
    tags: ProjectTag[];
    public_location: string | null;
    created_at: string;
    project_media: ProjectMedia[];
  };

  // 関連プロジェクトを取得（タグの共通数が多い順）
  const currentTags = (project.tags || []) as ProjectTag[];
  let relatedProjects: RelatedProject[] = [];

  if (currentTags.length > 0) {
    // タグが1つ以上共通するプロジェクトを取得
    const { data: candidates } = await supabase
      .from('projects')
      .select(`
        id,
        public_title,
        tags,
        public_location,
        created_at,
        public_reviewed_at,
        project_media!project_media_project_id_fkey (
          id, project_id, type, phase, file_url, thumbnail_url, caption,
          is_featured, publication_status, created_at
        )
      `)
      .eq('is_public', true)
      .not('public_reviewed_at', 'is', null)
      .overlaps('tags', currentTags)
      .neq('id', id);

    if (candidates && candidates.length > 0) {
      // 共通タグ数でソートし、上位3件を取得
      relatedProjects = (candidates as RelatedProject[])
        .map((p) => ({
          ...p,
          _commonTagCount: (p.tags || []).filter((t) => currentTags.includes(t)).length,
        }))
        .sort((a, b) => {
          // 共通タグ数の降順、同数なら新しい順
          if (b._commonTagCount !== a._commonTagCount) {
            return b._commonTagCount - a._commonTagCount;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 3);
    }
  }

  // フォールバック: 共通タグのプロジェクトが3件未満の場合、最新のプロジェクトで補完
  if (relatedProjects.length < 3) {
    const existingIds = [id, ...relatedProjects.map((p) => p.id)];
    const { data: fallbackProjects } = await supabase
      .from('projects')
      .select(`
        id,
        public_title,
        tags,
        public_location,
        created_at,
        public_reviewed_at,
        project_media!project_media_project_id_fkey (
          id, project_id, type, phase, file_url, thumbnail_url, caption,
          is_featured, publication_status, created_at
        )
      `)
      .eq('is_public', true)
      .not('public_reviewed_at', 'is', null)
      .not('id', 'in', `(${existingIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(3 - relatedProjects.length);

    if (fallbackProjects) {
      relatedProjects = [...relatedProjects, ...(fallbackProjects as RelatedProject[])];
    }
  }

  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero section */}
      <section className="relative py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/works"
            className="inline-flex items-center text-[#666666] hover:text-[#26A69A] transition-colors mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            施工実績一覧に戻る
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Main image */}
            <div className="aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden">
              {mainImage ? (
                <img
                  src={mainImage.file_url}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#999999]">
                  画像準備中
                </div>
              )}
            </div>

            {/* Project info */}
            <div className="flex flex-col justify-center">
              <div className="flex flex-wrap gap-2 mb-4">
                {project.tags?.map((tag: ProjectTag) => (
                  <span
                    key={tag}
                    className="inline-block bg-[#26A69A] text-white text-xs font-medium px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-6">
                {displayTitle}
              </h1>

              <div className="space-y-4">
                {project.public_location && (
                  <div className="flex items-center text-[#666666]">
                    <MapPin className="mr-3 h-5 w-5 text-[#26A69A]" />
                    <span>{project.public_location}</span>
                  </div>
                )}
                {project.start_date && (
                  <div className="flex items-center text-[#666666]">
                    <Calendar className="mr-3 h-5 w-5 text-[#26A69A]" />
                    <span>
                      {project.start_date}
                      {project.end_date && ` 〜 ${project.end_date}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Description section */}
      {project.public_description && (
        <DescriptionSection content={project.public_description} />
      )}

      {/* Gallery section */}
      {(mediaByPhase.before.length > 0 || mediaByPhase.during.length > 0 || mediaByPhase.after.length > 0) && (
        <section className="py-16 lg:py-24 bg-[#F0EFE9]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm tracking-widest text-[#26A69A] mb-4">GALLERY</p>
              <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
                施工写真
              </h2>
            </div>

            <WorkDetailGallery mediaByPhase={mediaByPhase} beforeAfterPairs={typedPairs} />
          </div>
        </section>
      )}

      {/* Related projects */}
      {relatedProjects && relatedProjects.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm tracking-widest text-[#26A69A] mb-4">RELATED</p>
              <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
                関連する施工実績
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedProjects.map((related) => {
                const relatedPublishedMedia = (related.project_media as ProjectMedia[])?.filter(
                  (media) => !media.is_featured && media.publication_status === 'published',
                ) || [];
                const relatedMedia = relatedPublishedMedia.find((m) => m.phase === 'after') || relatedPublishedMedia[0];
                const relatedTitle = related.public_title || '施工事例';

                return (
                  <Link
                    key={related.id}
                    href={`/works/${related.id}`}
                    className="group"
                  >
                    <div className="aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden mb-4">
                      {relatedMedia?.file_url ? (
                        <img
                          src={relatedMedia.file_url}
                          alt={relatedTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                          準備中
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#999999] mb-1">{related.public_location}</p>
                    <h3 className="text-lg font-medium text-[#333333] group-hover:text-[#26A69A] transition-colors">
                      {relatedTitle}
                    </h3>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA section */}
      <section className="py-24 lg:py-32 bg-[#F0EFE9]">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">CONTACT</p>
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-6">
            同様の工事をご検討ですか？
          </h2>
          <p className="text-[#666666] mb-12 leading-relaxed">
            建物の状態やご希望に合わせて、工事内容を整理します。<br />
            ご相談・現地確認・お見積もりは無料です。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="tel:090-3357-4379"
              className="inline-flex items-center justify-center border border-[#26A69A] text-[#26A69A] px-8 py-4 text-sm tracking-wide hover:bg-[#26A69A] hover:text-white transition-colors"
            >
              <Phone className="mr-3 h-4 w-4" />
              090-3357-4379
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-[#26A69A] text-white px-8 py-4 text-sm font-medium tracking-wide hover:bg-[#009688] transition-colors"
            >
              お問い合わせフォーム
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
