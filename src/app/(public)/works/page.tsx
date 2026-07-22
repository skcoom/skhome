import Link from 'next/link';
import { Phone } from 'lucide-react';
import { createPublicClient } from '@/lib/supabase/server';
import type { ProjectMedia } from '@/types/database';
import { WorksGrid } from './works-grid';
import { PROJECT_TAGS } from '@/lib/constants';

export interface WorkItem {
  id: string;
  name: string;
  tags: string[];
  address: string | null;
  description: string | null;
  year: string;
  thumbnailUrl: string | null;
}

export const revalidate = 300;

export default async function WorksPage() {
  const supabase = createPublicClient();

  // 公開されているプロジェクトを取得
  // project_media_project_id_fkey を明示的に指定（main_media_id との関係と区別するため）
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      public_title,
      public_location,
      public_description,
      tags,
      start_date,
      created_at,
      main_media_id,
      project_media!project_media_project_id_fkey (
        id,
        type,
        phase,
        file_url,
        thumbnail_url,
        is_featured,
        publication_status
      )
    `)
    .eq('is_public', true)
    .not('public_reviewed_at', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Projects fetch error:', error);
  }

  // WorkItem形式に変換
  const works: WorkItem[] = (projects || []).map((project) => {
    // ログイン中に公開ページを見ても、社内限定写真を混ぜない。
    const publishedMedia = (project.project_media as ProjectMedia[] | null)?.filter(
      (media) => !media.is_featured && media.publication_status === 'published',
    ) || [];
    // 1. main_media_idが設定されていればその画像を優先
    // 2. なければ施工後 > 施工中 > 施工前 > 最初の画像
    const designatedMainMedia = project.main_media_id
      ? publishedMedia.find((m) => m.id === project.main_media_id)
      : null;
    const afterMedia = publishedMedia.find((m) => m.phase === 'after' && m.type === 'image');
    const duringMedia = publishedMedia.find((m) => m.phase === 'during' && m.type === 'image');
    const beforeMedia = publishedMedia.find((m) => m.phase === 'before' && m.type === 'image');
    const anyMedia = publishedMedia.find((m) => m.type === 'image');
    const thumbnail = designatedMainMedia || afterMedia || duringMedia || beforeMedia || anyMedia;

    return {
      id: project.id,
      name: project.public_title || '施工事例',
      tags: project.tags || [],
      address: project.public_location || null,
      description: project.public_description || null,
      year: project.start_date ? new Date(project.start_date).getFullYear().toString() : new Date(project.created_at).getFullYear().toString(),
      thumbnailUrl: thumbnail?.thumbnail_url || thumbnail?.file_url || null,
    };
  });

  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero section */}
      <section className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">
              WORKS
            </p>
            <h1 className="text-3xl lg:text-4xl font-medium leading-relaxed text-[#333333] mb-8">
              施工実績
            </h1>
            <p className="text-[#666666] leading-relaxed">
              公開のご了承をいただいた施工事例をご紹介します。<br />
              写真や工事内容を、ご相談前の参考としてご覧ください。
            </p>
          </div>
        </div>

        {/* Vertical text */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2">
          <p className="vertical-text text-2xl tracking-widest text-[#E5E4E0] font-medium">
            施工実績
          </p>
        </div>
      </section>

      {/* Works grid with filter */}
      <WorksGrid works={works} tags={PROJECT_TAGS} />

      {/* Process section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">FLOW</p>
            <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
              ご依頼の流れ
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'ご相談', description: '今困っていることや、ご希望を分かる範囲でお聞かせください。' },
              { step: '02', title: '現地確認', description: '建物の状態と寸法を確認し、できる工事と制約を整理します。' },
              { step: '03', title: 'ご提案・お見積もり', description: '工事内容、費用、工程をご説明し、ご判断いただきます。' },
              { step: '04', title: '施工・ご確認', description: '内容にご納得いただいてから施工し、完成後に仕上がりをご確認いただきます。' },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-[#F0EFE9] rounded-xl p-6 lg:p-8 h-full">
                  <span className="text-4xl font-light text-[#26A69A] mb-4 block">
                    {item.step}
                  </span>
                  <h3 className="text-lg font-medium text-[#333333] mb-3">{item.title}</h3>
                  <p className="text-sm text-[#666666] leading-relaxed">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-[#E5E4E0] text-2xl">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-24 lg:py-32 bg-[#F0EFE9]">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">CONTACT</p>
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-6">
            写真にない工事も、ご相談ください
          </h2>
          <p className="text-[#666666] mb-12 leading-relaxed">
            建物ごとに状態や工事内容は異なります。<br />
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
