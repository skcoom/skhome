import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Project, ProjectMedia, BlogPost } from '@/types/database';
import { PROJECT_CATEGORY_LABELS, BLOG_CATEGORY_LABELS } from '@/lib/constants';

const blogCategoryStyles: Record<string, string> = {
  news: 'bg-[#FAF9F6] text-[#666666] border border-[#E5E4E0]',
  column: 'bg-[#FAF9F6] text-[#666666] border border-[#E5E4E0]',
  case_study: 'bg-[#26A69A] text-white',
};

export default async function HomePage() {
  const supabase = await createClient();

  // ファーストビュー用：hero_positionが設定されているメディアを取得
  const { data: heroMedia } = await supabase
    .from('project_media')
    .select('*')
    .not('hero_position', 'is', null)
    .order('hero_position', { ascending: true });

  // 公開されているプロジェクトを3件取得
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      project_media!project_media_project_id_fkey (*)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(3);

  // 公開されているブログ記事を2件取得
  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(2);

  // プロジェクトデータを整形
  const featuredWorks = (projects || []).map((project: Project & { project_media: ProjectMedia[] }) => {
    // 画像を優先、なければ動画もフォールバックとして使用
    const featuredImage = project.project_media?.find((m) => m.is_featured && m.type === 'image');
    const featuredVideo = project.project_media?.find((m) => m.is_featured && m.type === 'video');
    const afterImage = project.project_media?.find((m) => m.phase === 'after' && m.type === 'image');
    const afterVideo = project.project_media?.find((m) => m.phase === 'after' && m.type === 'video');
    const anyImage = project.project_media?.find((m) => m.type === 'image');
    const anyVideo = project.project_media?.find((m) => m.type === 'video');
    const thumbnail = featuredImage || featuredVideo || afterImage || afterVideo || anyImage || anyVideo;

    return {
      id: project.id,
      name: project.name,
      category: PROJECT_CATEGORY_LABELS[project.category] || project.category,
      description: project.description || '',
      thumbnailUrl: thumbnail?.file_url || null,
      thumbnailType: (thumbnail?.type || 'image') as 'image' | 'video',
      posterUrl: thumbnail?.thumbnail_url || null,
    };
  });

  // ファーストビュー用メディアを整形（hero設定があればそれを使用、なければfeaturedWorksから）
  const heroItems: { url: string; type: 'image' | 'video'; thumbnailUrl?: string }[] = [];
  for (let i = 1; i <= 3; i++) {
    const heroItem = heroMedia?.find((m) => m.hero_position === i);
    if (heroItem) {
      heroItems.push({
        url: heroItem.file_url,
        type: heroItem.type,
        thumbnailUrl: heroItem.thumbnail_url || undefined,
      });
    } else {
      // フォールバック：featuredWorksを順番に使用
      const fallbackIndex = i - 1;
      const fallback = featuredWorks[fallbackIndex];
      heroItems.push({
        url: fallback?.thumbnailUrl || '',
        type: fallback?.thumbnailType || 'image',
        thumbnailUrl: fallback?.posterUrl || undefined,
      });
    }
  }

  // ブログデータを整形
  const latestPosts = (blogPosts || []).map((post: BlogPost) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    category: post.category,
    categoryLabel: BLOG_CATEGORY_LABELS[post.category] || post.category,
    categoryStyle: blogCategoryStyles[post.category] || 'bg-gray-100 text-gray-600',
    publishedAt: post.published_at ? new Date(post.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.') : '',
    featuredImage: post.featured_image || null,
  }));

  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero section */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left content */}
            <div className="lg:col-span-5 relative z-10">
              <p className="text-sm tracking-widest text-[#26A69A] mb-4">
                SINCE 2010
              </p>
              <h1 className="text-3xl lg:text-4xl font-medium leading-relaxed text-[#333333] mb-8">
                暮らしの「つづき」を、<br />
                つくる会社です。
              </h1>
              <p className="text-[#666666] leading-relaxed mb-8 max-w-md">
                私たちはリフォームを通じて、お客様の暮らしの「つづき」をつくります。
                空き家の再生、住まいのリノベーション。
                あるものに光をあてて、地域の未来をつくります。
              </p>
              <Link
                href="/company"
                className="inline-flex items-center text-[#333333] text-sm tracking-wide group"
              >
                <span className="mr-2">&gt;</span>
                <span className="relative">
                  詳しくはこちら
                  <span className="absolute -bottom-1 left-0 w-full h-px bg-[#333333]" />
                </span>
              </Link>
            </div>

            {/* Center/Right images/videos */}
            <div className="lg:col-span-7 relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden relative">
                    {heroItems[0]?.url ? (
                      heroItems[0].type === 'video' ? (
                        <video
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          poster={heroItems[0].thumbnailUrl}
                        >
                          <source src={heroItems[0].url} type="video/mp4" />
                        </video>
                      ) : (
                        <Image src={heroItems[0].url} alt="施工写真" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                        施工写真
                      </div>
                    )}
                  </div>
                  <div className="aspect-square bg-[#E5E4E0] rounded-lg overflow-hidden relative">
                    {heroItems[1]?.url ? (
                      heroItems[1].type === 'video' ? (
                        <video
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          poster={heroItems[1].thumbnailUrl}
                        >
                          <source src={heroItems[1].url} type="video/mp4" />
                        </video>
                      ) : (
                        <Image src={heroItems[1].url} alt="施工写真" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                        施工写真
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-12">
                  <div className="aspect-[3/4] bg-[#E5E4E0] rounded-lg overflow-hidden relative">
                    {heroItems[2]?.url ? (
                      heroItems[2].type === 'video' ? (
                        <video
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          poster={heroItems[2].thumbnailUrl}
                        >
                          <source src={heroItems[2].url} type="video/mp4" />
                        </video>
                      ) : (
                        <Image src={heroItems[2].url} alt="施工写真" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                        施工写真
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Teal badge */}
              <div className="absolute -right-4 bottom-1/4 lg:right-0">
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-[#26A69A] rounded-full flex items-center justify-center text-center">
                  <div className="text-xs lg:text-sm font-medium text-white leading-tight">
                    From<br />
                    Kawaguchi<br />
                    Saitama
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical text */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2">
          <p className="vertical-text text-2xl tracking-widest text-[#E5E4E0] font-medium">
            つづきをつくる
          </p>
        </div>
      </section>

      {/* Features section */}
      <section className="py-24 lg:py-32 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">WHY CHOOSE US</p>
            <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
              SKコームが選ばれる理由
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                num: '01',
                title: '直接対話',
                description: '職人が直接お客様のご要望をお伺いします。中間マージンがないため、コストを抑えながら高品質な施工を実現。',
              },
              {
                num: '02',
                title: '明確な見積り',
                description: '分かりやすい見積書で、何にいくらかかるのか明確にご説明。追加料金の心配がありません。',
              },
              {
                num: '03',
                title: '確かな技術',
                description: '経験豊富な職人が丁寧に施工。細部にまでこだわり、長く愛される住まいをお届けします。',
              },
            ].map((feature) => (
              <div key={feature.num} className="bg-[#FAF9F6] rounded-xl p-8 lg:p-10">
                <span className="text-4xl font-light text-[#E5E4E0] mb-4 block">
                  {feature.num}
                </span>
                <h3 className="text-xl font-medium text-[#333333] mb-4">{feature.title}</h3>
                <p className="text-[#666666] text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Works section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-sm tracking-widest text-[#26A69A] mb-4">WORKS</p>
              <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">施工実績</h2>
            </div>
            <Link
              href="/works"
              className="hidden md:inline-flex items-center text-[#333333] text-sm tracking-wide group"
            >
              <span className="mr-2">&gt;</span>
              <span className="relative">
                すべて見る
                <span className="absolute -bottom-1 left-0 w-full h-px bg-[#333333]" />
              </span>
            </Link>
          </div>

          {featuredWorks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {featuredWorks.map((work) => (
                <Link
                  key={work.id}
                  href={`/works/${work.id}`}
                  className="group"
                >
                  <div className="relative aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden mb-4">
                    {work.thumbnailUrl ? (
                      <Image
                        src={work.thumbnailUrl}
                        alt={work.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                        準備中
                      </div>
                    )}
                    {/* Category badge */}
                    <div className="absolute top-4 left-4">
                      <span className="inline-block bg-[#26A69A] text-white text-xs font-medium px-3 py-1 rounded-full">
                        {work.category}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-[#333333] group-hover:text-[#26A69A] transition-colors mb-2">
                    {work.name}
                  </h3>
                  <p className="text-sm text-[#666666] line-clamp-2">{work.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[#999999]">施工実績を準備中です</p>
            </div>
          )}

          <div className="text-center mt-12 md:hidden">
            <Link
              href="/works"
              className="inline-flex items-center text-[#333333] text-sm tracking-wide"
            >
              <span className="mr-2">&gt;</span>
              <span className="relative">
                すべての施工実績を見る
                <span className="absolute -bottom-1 left-0 w-full h-px bg-[#333333]" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Blog section */}
      <section className="py-24 lg:py-32 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-sm tracking-widest text-[#26A69A] mb-4">BLOG</p>
              <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">ブログ</h2>
            </div>
            <Link
              href="/blog"
              className="hidden md:inline-flex items-center text-[#333333] text-sm tracking-wide group"
            >
              <span className="mr-2">&gt;</span>
              <span className="relative">
                すべて見る
                <span className="absolute -bottom-1 left-0 w-full h-px bg-[#333333]" />
              </span>
            </Link>
          </div>

          {latestPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {latestPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group flex gap-6">
                  <div className="relative w-32 h-24 bg-[#E5E4E0] rounded-lg flex-shrink-0 overflow-hidden">
                    {post.featuredImage ? (
                      <Image src={post.featuredImage} alt={post.title} fill className="object-cover" sizes="128px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999999] text-xs">
                        準備中
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${post.categoryStyle}`}>
                      {post.categoryLabel}
                    </span>
                    <h3 className="text-base font-medium text-[#333333] group-hover:text-[#26A69A] transition-colors mb-1 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-[#999999]">{post.publishedAt}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[#999999]">ブログ記事を準備中です</p>
            </div>
          )}

          <div className="text-center mt-12 md:hidden">
            <Link
              href="/blog"
              className="inline-flex items-center text-[#333333] text-sm tracking-wide"
            >
              <span className="mr-2">&gt;</span>
              <span className="relative">
                すべてのブログを見る
                <span className="absolute -bottom-1 left-0 w-full h-px bg-[#333333]" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-24 lg:py-32">
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
              <ArrowRight className="ml-3 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
