'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Sparkles, Phone } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

const POSTS_PER_PAGE = 9;

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  ai_generated: boolean;
  published_at: string;
  featured_image: string | null;
}

const categoryLabels: Record<string, string> = {
  all: 'すべて',
  news: 'ニュース',
  column: 'コラム',
  case_study: '施工事例',
};

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch('/api/blog?status=published');
        if (response.ok) {
          const data = await response.json();
          setBlogPosts(data);
        }
      } catch (error) {
        console.error('Failed to fetch blog posts:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    return activeCategory === 'all'
      ? blogPosts
      : blogPosts.filter((post) => post.category === activeCategory);
  }, [blogPosts, activeCategory]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero section */}
      <section className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">
              BLOG
            </p>
            <h1 className="text-3xl lg:text-4xl font-medium leading-relaxed text-[#333333] mb-8">
              ブログ
            </h1>
            <p className="text-[#666666] leading-relaxed">
              施工事例やリフォームに関するお役立ち情報をお届けします。<br />
              AIが自動生成した施工レポートも掲載しています。
            </p>
          </div>
        </div>

        {/* Vertical text */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2">
          <p className="vertical-text text-2xl tracking-widest text-[#E5E4E0] font-medium">
            ブログ
          </p>
        </div>
      </section>

      {/* Category filter */}
      <section className="py-8 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleCategoryChange(key)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === key
                    ? 'bg-[#26A69A] text-white'
                    : 'bg-[#FAF9F6] text-[#666666] hover:bg-[#E5E4E0]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog posts grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {isLoading ? (
            <div className="text-center py-16">
              <p className="text-[#999999]">読み込み中...</p>
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedPosts.map((post) => (
                <article key={post.id} className="group">
                  <Link href={`/blog/${post.slug}`}>
                    {/* Featured image */}
                    <div className="relative aspect-[16/10] bg-[#E5E4E0] rounded-lg overflow-hidden mb-4">
                      {post.featured_image ? (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                          準備中
                        </div>
                      )}
                      {/* Category badge */}
                      <div className="absolute top-4 left-4">
                        <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
                          post.category === 'case_study'
                            ? 'bg-[#26A69A] text-white'
                            : post.category === 'column'
                            ? 'bg-[#FAF9F6] text-[#666666] border border-[#E5E4E0]'
                            : 'bg-[#333333] text-white'
                        }`}>
                          {categoryLabels[post.category] || post.category}
                        </span>
                      </div>
                      {/* AI badge */}
                      {post.ai_generated && (
                        <div className="absolute top-4 right-4">
                          <span className="inline-flex items-center bg-[#E0F2F1] text-[#26A69A] text-xs font-medium px-2 py-1 rounded">
                            <Sparkles className="mr-1 h-3 w-3" />
                            AI
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                      {/* Date */}
                      <div className="flex items-center text-xs text-[#999999]">
                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                        {post.published_at ? new Date(post.published_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }) : ''}
                      </div>

                      {/* Title */}
                      <h2 className="text-lg font-medium text-[#333333] group-hover:text-[#26A69A] transition-colors line-clamp-2">
                        {post.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-sm text-[#666666] line-clamp-2">
                        {post.excerpt}
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-[#999999]">該当する記事がありません</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </section>

      {/* Featured topics */}
      <section className="py-16 lg:py-24 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">TOPICS</p>
            <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
              人気のトピック
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'キッチンリフォーム', count: 12 },
              { label: 'マンション', count: 8 },
              { label: '浴室・お風呂', count: 6 },
              { label: 'トイレ', count: 5 },
              { label: '内装工事', count: 10 },
              { label: '新築', count: 4 },
              { label: '店舗', count: 3 },
              { label: '外構', count: 2 },
            ].map((topic, index) => (
              <button
                key={index}
                className="bg-[#FAF9F6] rounded-lg p-4 text-left hover:bg-white transition-colors"
              >
                <p className="text-sm font-medium text-[#333333] mb-1">{topic.label}</p>
                <p className="text-xs text-[#999999]">{topic.count}件の記事</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* About AI generation */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-[#E0F2F1] rounded-2xl p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <div className="flex items-center mb-4">
                  <Sparkles className="h-5 w-5 text-[#26A69A] mr-2" />
                  <p className="text-sm tracking-widest text-[#26A69A]">AI BLOG</p>
                </div>
                <h2 className="text-xl lg:text-2xl font-medium text-[#333333] mb-4">
                  AIによる施工レポート自動生成
                </h2>
                <p className="text-[#666666] leading-relaxed">
                  SKコームでは、施工完了後の事例をAIが自動でブログ記事にまとめています。
                  お客様のプライバシーに配慮しながら、施工のポイントや工夫した点を
                  分かりやすくお伝えします。
                </p>
              </div>
              <div className="lg:col-span-4 text-center lg:text-right">
                <div className="inline-flex items-center bg-[#26A69A] text-white px-4 py-2 rounded-full text-sm">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Powered by Claude AI
                </div>
              </div>
            </div>
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
