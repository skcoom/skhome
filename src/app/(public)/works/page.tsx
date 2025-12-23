import Link from 'next/link';
import { Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Project, ProjectMedia } from '@/types/database';
import { WorksGrid } from './works-grid';
import { PROJECT_CATEGORY_LABELS } from '@/lib/constants';

export interface WorkItem {
  id: string;
  name: string;
  category: string;
  address: string | null;
  description: string | null;
  year: string;
  thumbnailUrl: string | null;
}

export default async function WorksPage() {
  const supabase = await createClient();

  // 公開されているプロジェクトを取得
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_media (*)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Projects fetch error:', error);
  }

  // WorkItem形式に変換
  const works: WorkItem[] = (projects || []).map((project: Project & { project_media: ProjectMedia[] }) => {
    // 掲載対象のメディアのみ（is_featured: trueは非掲載）
    const publishedMedia = project.project_media?.filter((m) => !m.is_featured) || [];
    // 施工後 > 施工中 > 施工前 > 最初の画像
    const afterMedia = publishedMedia.find((m) => m.phase === 'after' && m.type === 'image');
    const duringMedia = publishedMedia.find((m) => m.phase === 'during' && m.type === 'image');
    const beforeMedia = publishedMedia.find((m) => m.phase === 'before' && m.type === 'image');
    const anyMedia = publishedMedia.find((m) => m.type === 'image');
    const thumbnail = afterMedia || duringMedia || beforeMedia || anyMedia;

    return {
      id: project.id,
      name: project.name,
      category: project.category,
      address: project.address || null,
      description: project.description || null,
      year: project.start_date ? new Date(project.start_date).getFullYear().toString() : new Date(project.created_at).getFullYear().toString(),
      thumbnailUrl: thumbnail?.file_url || null,
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
              これまでに手がけた施工事例をご紹介します。<br />
              リフォーム、マンション工事、新築工事など、<br />
              お客様のご要望に合わせた確かな施工をお届けしています。
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
      <WorksGrid works={works} categoryLabels={PROJECT_CATEGORY_LABELS} />

      {/* Stats section */}
      <section className="py-16 lg:py-24 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">ACHIEVEMENT</p>
            <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
              これまでの実績
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { number: '500+', label: '施工件数' },
              { number: '10', label: '年以上の実績' },
              { number: '98%', label: '顧客満足度' },
              { number: '7', label: '名の職人' },
            ].map((stat, index) => (
              <div key={index} className="bg-[#FAF9F6] rounded-xl p-6 lg:p-8 text-center">
                <p className="text-3xl lg:text-4xl font-medium text-[#26A69A] mb-2">
                  {stat.number}
                </p>
                <p className="text-sm text-[#666666]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              { step: '01', title: 'お問い合わせ', description: 'お電話またはフォームからお気軽にご連絡ください。' },
              { step: '02', title: '現地調査', description: '無料で現地にお伺いし、ご要望をお伺いします。' },
              { step: '03', title: 'お見積り', description: '詳細な見積書を作成し、ご説明いたします。' },
              { step: '04', title: '施工', description: '職人が丁寧に施工。完成後もサポートします。' },
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
            お気軽にご相談ください
          </h2>
          <p className="text-[#666666] mb-12 leading-relaxed">
            リフォームのことなら何でもお気軽にご相談ください。<br />
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
