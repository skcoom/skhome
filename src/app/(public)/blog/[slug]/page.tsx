import Link from 'next/link';
import { ArrowLeft, Calendar, Sparkles, Share2, Phone, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { generateBlogPostingData, generateBreadcrumbData } from '@/lib/structured-data';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string;
  ai_generated: boolean;
  published_at: string | null;
  featured_image: string | null;
  status: string;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, featured_image, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!post) {
    return {
      title: '記事が見つかりません',
    };
  }

  const description = post.excerpt || `${post.title} - SKコームのブログ記事です。`;
  const ogImage = post.featured_image || '/og-image.png';

  return {
    title: post.title,
    description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      url: `${siteUrl}/blog/${slug}`,
      publishedTime: post.published_at || undefined,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [ogImage],
    },
  };
}

const categoryLabels: Record<string, string> = {
  news: 'ニュース',
  column: 'コラム',
  case_study: '施工事例',
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 記事をスラッグで取得
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !post) {
    notFound();
  }

  const blogPost = post as BlogPost;

  // 関連記事を取得
  const { data: relatedPosts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('category', blogPost.category)
    .eq('status', 'published')
    .neq('slug', slug)
    .order('published_at', { ascending: false })
    .limit(3);

  const related = (relatedPosts || []) as BlogPost[];

  // 構造化データを生成
  const blogPostingJsonLd = generateBlogPostingData({
    title: blogPost.title,
    description: blogPost.excerpt || `${blogPost.title} - SKコームのブログ記事です。`,
    slug: blogPost.slug,
    publishedAt: blogPost.published_at,
    featuredImage: blogPost.featured_image,
  });

  const breadcrumbJsonLd = generateBreadcrumbData([
    { name: 'ホーム', url: '/' },
    { name: 'ブログ', url: '/blog' },
    { name: blogPost.title, url: `/blog/${blogPost.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    <div className="bg-[#FAF9F6]">
      {/* Hero section */}
      <section className="relative py-16 lg:py-24 bg-[#F0EFE9]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center text-[#666666] hover:text-[#26A69A] transition-colors mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            ブログ一覧に戻る
          </Link>

          {/* Header */}
          <header>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
                blogPost.category === 'case_study'
                  ? 'bg-[#26A69A] text-white'
                  : blogPost.category === 'column'
                  ? 'bg-[#FAF9F6] text-[#666666] border border-[#E5E4E0]'
                  : 'bg-[#333333] text-white'
              }`}>
                {categoryLabels[blogPost.category] || blogPost.category}
              </span>
              {blogPost.ai_generated && (
                <span className="inline-flex items-center bg-[#E0F2F1] text-[#26A69A] text-xs font-medium px-2.5 py-1 rounded">
                  <Sparkles className="mr-1 h-3 w-3" />
                  AI生成
                </span>
              )}
            </div>

            <h1 className="text-2xl lg:text-4xl font-medium text-[#333333] leading-relaxed mb-6">
              {blogPost.title}
            </h1>

            <div className="flex items-center justify-between text-sm text-[#999999]">
              <span className="flex items-center">
                <Calendar className="mr-1.5 h-4 w-4" />
                {blogPost.published_at ? new Date(blogPost.published_at).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : ''}
              </span>
              <button className="flex items-center hover:text-[#26A69A] transition-colors">
                <Share2 className="mr-1.5 h-4 w-4" />
                シェア
              </button>
            </div>
          </header>
        </div>
      </section>

      {/* Content section */}
      <section className="py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          {/* Featured image */}
          <div className="aspect-video bg-[#E5E4E0] rounded-xl mb-12 flex items-center justify-center text-[#999999] overflow-hidden">
            {blogPost.featured_image ? (
              <img
                src={blogPost.featured_image}
                alt={blogPost.title}
                className="w-full h-full object-cover"
              />
            ) : (
              '準備中'
            )}
          </div>

          {/* Article content */}
          <article className="prose-custom">
            {blogPost.content.split('\n').map((line, index) => {
              if (line.startsWith('## ')) {
                return (
                  <h2 key={index} className="text-xl lg:text-2xl font-medium text-[#333333] mt-12 mb-6 pb-3 border-b border-[#E5E4E0]">
                    {line.replace('## ', '')}
                  </h2>
                );
              }
              if (line.startsWith('### ')) {
                return (
                  <h3 key={index} className="text-lg font-medium text-[#333333] mt-8 mb-4 flex items-center">
                    <span className="w-1 h-5 bg-[#26A69A] rounded mr-3" />
                    {line.replace('### ', '')}
                  </h3>
                );
              }
              if (line.startsWith('# ')) {
                return (
                  <h2 key={index} className="text-xl lg:text-2xl font-medium text-[#333333] mt-12 mb-6 pb-3 border-b border-[#E5E4E0]">
                    {line.replace('# ', '')}
                  </h2>
                );
              }
              if (line.startsWith('> ')) {
                return (
                  <blockquote
                    key={index}
                    className="border-l-4 border-[#26A69A] bg-[#F0EFE9] pl-6 pr-4 py-4 my-6 rounded-r-lg"
                  >
                    <p className="text-[#666666] italic leading-relaxed">
                      {line.replace('> ', '')}
                    </p>
                  </blockquote>
                );
              }
              if (line.startsWith('- ')) {
                return (
                  <li key={index} className="ml-6 text-[#666666] leading-relaxed mb-2 flex items-start">
                    <span className="w-1.5 h-1.5 bg-[#26A69A] rounded-full mr-3 mt-2.5 flex-shrink-0" />
                    <span>{line.replace('- ', '')}</span>
                  </li>
                );
              }
              if (line === '---') {
                return <hr key={index} className="my-12 border-[#E5E4E0]" />;
              }
              if (line.trim() === '') {
                return <div key={index} className="h-4" />;
              }
              // **太字** の処理
              const boldText = line.replace(
                /\*\*(.*?)\*\*/g,
                '<strong class="font-medium text-[#333333]">$1</strong>'
              );
              return (
                <p
                  key={index}
                  className="text-[#666666] leading-loose mb-4"
                  dangerouslySetInnerHTML={{ __html: boldText }}
                />
              );
            })}
          </article>

          {/* Tags / Share */}
          <div className="mt-12 pt-8 border-t border-[#E5E4E0] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-[#999999] mr-2">カテゴリ:</span>
              <span className="text-xs text-[#666666] bg-[#F0EFE9] px-3 py-1 rounded-full">
                {categoryLabels[blogPost.category] || blogPost.category}
              </span>
            </div>
            <button className="flex items-center text-sm text-[#666666] hover:text-[#26A69A] transition-colors">
              <Share2 className="mr-1.5 h-4 w-4" />
              この記事をシェア
            </button>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="bg-[#E0F2F1] rounded-2xl p-8 lg:p-12">
            <div className="text-center">
              <h3 className="text-xl lg:text-2xl font-medium text-[#333333] mb-4">
                リフォームのご相談はお気軽に
              </h3>
              <p className="text-[#666666] mb-8 leading-relaxed">
                SKコームでは、お客様のご要望に合わせたリフォームをご提案いたします。<br />
                現地調査・お見積りは無料です。
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a
                  href="tel:048-711-1359"
                  className="inline-flex items-center justify-center border border-[#26A69A] text-[#26A69A] px-6 py-3 text-sm tracking-wide hover:bg-[#26A69A] hover:text-white transition-colors rounded-lg"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  048-711-1359
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center bg-[#26A69A] text-white px-6 py-3 text-sm font-medium tracking-wide hover:bg-[#009688] transition-colors rounded-lg"
                >
                  無料相談・お見積り
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="py-16 lg:py-24 bg-[#F0EFE9]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm tracking-widest text-[#26A69A] mb-4">RELATED</p>
              <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
                関連記事
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {related.map((relatedPost) => (
                <article key={relatedPost.id} className="group">
                  <Link href={`/blog/${relatedPost.slug}`}>
                    <div className="relative aspect-[16/10] bg-[#E5E4E0] rounded-lg overflow-hidden mb-4">
                      {relatedPost.featured_image ? (
                        <img
                          src={relatedPost.featured_image}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                          準備中
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
                          relatedPost.category === 'case_study'
                            ? 'bg-[#26A69A] text-white'
                            : relatedPost.category === 'column'
                            ? 'bg-[#FAF9F6] text-[#666666] border border-[#E5E4E0]'
                            : 'bg-[#333333] text-white'
                        }`}>
                          {categoryLabels[relatedPost.category]}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-[#999999]">
                        {relatedPost.published_at ? new Date(relatedPost.published_at).toLocaleDateString('ja-JP') : ''}
                      </p>
                      <h3 className="text-base font-medium text-[#333333] group-hover:text-[#26A69A] transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/blog"
                className="inline-flex items-center text-[#333333] text-sm tracking-wide group"
              >
                <span className="mr-2">&gt;</span>
                <span className="relative">
                  すべての記事を見る
                  <span className="absolute -bottom-1 left-0 w-full h-px bg-[#333333]" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// 動的レンダリングを使用
export const dynamic = 'force-dynamic';
