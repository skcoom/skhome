import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Project, ProjectMedia, ProjectTag, BeforeAfterPair } from '@/types/database';
import { WorkDetailGallery } from './gallery';
import { DescriptionSection } from './description-section';
import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select(`
      name,
      description,
      public_description,
      category,
      address,
      main_media_id,
      project_media!project_media_project_id_fkey (id, file_url, is_featured, phase, type)
    `)
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (!project) {
    return {
      title: '施工実績が見つかりません',
    };
  }

  const typedProject = project as Project & { project_media: ProjectMedia[] };
  const tagsLabel = typedProject.tags?.join('・') || 'リフォーム';
  // 公開用概要を優先、なければ管理用メモ、どちらもなければデフォルト文
  const description = typedProject.public_description || typedProject.description ||
    `${typedProject.name}の施工実績です。${tagsLabel}工事の詳細をご覧いただけます。`;

  // OG画像を取得
  // 1. main_media_idが設定されていればその画像を優先
  // 2. なければ掲載対象のみ、施工後 > 最初の画像
  const media = typedProject.project_media || [];
  const publishedMedia = media.filter((m) => !m.is_featured);
  const designatedMainMedia = typedProject.main_media_id
    ? publishedMedia.find((m) => m.id === typedProject.main_media_id)
    : null;
  const afterMedia = publishedMedia.find((m) => m.phase === 'after' && m.type === 'image');
  const firstImage = publishedMedia.find((m) => m.type === 'image');
  const ogImage = designatedMainMedia?.file_url || afterMedia?.file_url || firstImage?.file_url || '/og-image.png';

  return {
    title: `${typedProject.name} | 施工実績`,
    description,
    alternates: {
      canonical: `/works/${id}`,
    },
    openGraph: {
      title: `${typedProject.name} | 施工実績`,
      description,
      type: 'article',
      url: `${siteUrl}/works/${id}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: typedProject.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${typedProject.name} | 施工実績`,
      description,
      images: [ogImage],
    },
  };
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // プロジェクト詳細を取得
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_media!project_media_project_id_fkey (*)
    `)
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (error || !project) {
    notFound();
  }

  const typedProject = project as Project & { project_media: ProjectMedia[] };

  // 掲載対象のメディアのみ（is_featured: trueは非掲載）
  const publishedMedia = typedProject.project_media?.filter((m) => !m.is_featured) || [];

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
      *,
      before_media:project_media!before_media_id(*),
      after_media:project_media!after_media_id(*)
    `)
    .eq('project_id', id)
    .order('display_order', { ascending: true });

  const typedPairs = (beforeAfterPairs || []) as BeforeAfterPair[];

  // メイン画像を取得
  // 1. main_media_idが設定されていればその画像を使用
  // 2. なければフォールバック: 施工後 > 施工中 > 施工前 > 最初の画像
  const designatedMainImage = typedProject.main_media_id
    ? publishedMedia.find((m) => m.id === typedProject.main_media_id)
    : null;
  const afterMedia = mediaByPhase.after[0];
  const duringMedia = mediaByPhase.during[0];
  const beforeMedia = mediaByPhase.before[0];
  const mainImage = designatedMainImage || afterMedia || duringMedia || beforeMedia || publishedMedia.find((m) => m.type === 'image');

  // 関連プロジェクト用の型（表示に必要なフィールドのみ）
  type RelatedProject = {
    id: string;
    name: string;
    tags: ProjectTag[];
    address: string | null;
    created_at: string;
    project_media: ProjectMedia[];
  };

  // 関連プロジェクトを取得（タグの共通数が多い順）
  const currentTags = typedProject.tags || [];
  let relatedProjects: RelatedProject[] = [];

  if (currentTags.length > 0) {
    // タグが1つ以上共通するプロジェクトを取得
    const { data: candidates } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        tags,
        address,
        created_at,
        project_media!project_media_project_id_fkey (*)
      `)
      .eq('is_public', true)
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
        name,
        tags,
        address,
        created_at,
        project_media!project_media_project_id_fkey (*)
      `)
      .eq('is_public', true)
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
                  alt={typedProject.name}
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
                {typedProject.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block bg-[#26A69A] text-white text-xs font-medium px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-6">
                {typedProject.name}
              </h1>

              <div className="space-y-4">
                {typedProject.address && (
                  <div className="flex items-center text-[#666666]">
                    <MapPin className="mr-3 h-5 w-5 text-[#26A69A]" />
                    <span>{typedProject.address}</span>
                  </div>
                )}
                {typedProject.start_date && (
                  <div className="flex items-center text-[#666666]">
                    <Calendar className="mr-3 h-5 w-5 text-[#26A69A]" />
                    <span>
                      {typedProject.start_date}
                      {typedProject.end_date && ` 〜 ${typedProject.end_date}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Description section */}
      {(typedProject.public_description || typedProject.description) && (
        <DescriptionSection
          content={typedProject.public_description || typedProject.description || ''}
        />
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
                // 掲載対象のメディアのみ（is_featured: trueは非掲載）
                const relatedPublishedMedia = (related.project_media as ProjectMedia[])?.filter((m) => !m.is_featured) || [];
                const relatedMedia = relatedPublishedMedia.find((m) => m.phase === 'after') || relatedPublishedMedia[0];

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
                          alt={related.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                          準備中
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#999999] mb-1">{related.address}</p>
                    <h3 className="text-lg font-medium text-[#333333] group-hover:text-[#26A69A] transition-colors">
                      {related.name}
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
            お気軽にご相談ください。<br />
            現地調査・お見積りは無料です。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="tel:048-711-1359"
              className="inline-flex items-center justify-center border border-[#26A69A] text-[#26A69A] px-8 py-4 text-sm tracking-wide hover:bg-[#26A69A] hover:text-white transition-colors"
            >
              <Phone className="mr-3 h-4 w-4" />
              048-711-1359
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
