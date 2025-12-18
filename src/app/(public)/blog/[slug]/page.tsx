import Link from 'next/link';
import { ArrowLeft, Calendar, Sparkles, Share2, Phone, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';

// デモ用のブログ記事データ
const blogPosts = [
  {
    id: '1',
    title: '浦安マンション キッチンリフォーム完了',
    slug: 'urayasu-kitchen-remodel',
    excerpt:
      '築15年のマンションのキッチンを最新のシステムキッチンにリフォームしました。',
    content: `## 施工概要

千葉県浦安市にお住まいのお客様から、築15年のマンションのキッチンリフォームのご依頼をいただきました。

古くなったキッチンを最新のシステムキッチンに入れ替え、収納力と使い勝手を大幅に向上させました。

## 施工のポイント

### 1. システムキッチンの選定

お客様のライフスタイルに合わせて、LIXIL製のシステムキッチンをご提案しました。

- 食洗機内蔵タイプで家事の負担を軽減
- 引き出し式収納で出し入れがラクラク
- 人造大理石カウンターでお手入れ簡単

### 2. 収納力の向上

既存のキッチンと比較して、収納スペースが約1.5倍に増加。調理器具や食器をすっきり収納できるようになりました。

### 3. 照明の改善

キッチン上部にLED照明を設置し、手元が明るくなりました。料理がしやすくなったとお喜びいただいています。

## お客様の声

> 「キッチンが明るく使いやすくなって、毎日の料理が楽しくなりました。収納も増えて、スッキリ片付くようになりました。」

## 施工期間・費用

- 施工期間：5日間
- 費用：約180万円（税込）

---

キッチンリフォームをご検討の方は、ぜひお気軽にご相談ください。現地調査・お見積りは無料です。`,
    category: 'case_study',
    ai_generated: true,
    published_at: '2024-01-15',
    featured_image: null,
  },
  {
    id: '2',
    title: 'リフォームで失敗しないためのポイント5選',
    slug: 'remodel-tips-5',
    excerpt:
      'リフォームを検討中の方必見！失敗しないための重要なポイントをご紹介します。',
    content: `## はじめに

リフォームは大きな買い物。失敗したくないですよね。

この記事では、リフォームで失敗しないための重要なポイントを5つご紹介します。

## 1. 複数の業者から見積もりを取る

最低でも3社から見積もりを取ることをおすすめします。

- 価格の相場がわかる
- 各社の提案を比較できる
- 担当者の対応を確認できる

## 2. 予算は余裕を持って設定する

リフォームでは、想定外の費用が発生することがあります。

予算は当初の見積もりの**10〜20%増し**で考えておくと安心です。

## 3. 実績や口コミを確認する

業者を選ぶ際は、以下をチェックしましょう。

- 過去の施工実績
- お客様の口コミ・評判
- 保証やアフターサービスの内容

## 4. 打ち合わせは入念に

「言った・言わない」のトラブルを防ぐため、打ち合わせ内容は必ず書面で確認しましょう。

- 図面や仕様書をもらう
- 変更があれば書面で記録
- 疑問点はその場で確認

## 5. 工事中のコミュニケーション

工事が始まったら、定期的に進捗を確認しましょう。

気になることがあれば、早めに相談することが大切です。

---

SKコームでは、お客様とのコミュニケーションを大切にしています。リフォームのご相談は、お気軽にどうぞ。`,
    category: 'column',
    ai_generated: false,
    published_at: '2024-01-08',
    featured_image: null,
  },
  {
    id: '3',
    title: '大橋邸 キッチンリフォーム施工事例',
    slug: 'ohashi-kitchen',
    excerpt:
      '世田谷区の戸建て住宅でキッチンリフォームを行いました。',
    content: `## 施工概要

東京都世田谷区にお住まいの大橋様邸で、キッチンリフォームを行いました。

システムキッチンの入れ替えと背面収納の新設で、快適なキッチン空間が完成しました。

## Before / After

リフォーム前は、収納が少なく調理スペースも狭いキッチンでしたが、今回のリフォームで大きく改善されました。

## 施工のポイント

### 背面収納の新設

既存のキッチンには背面収納がなく、食器や調理器具の収納場所に困っていたとのこと。今回、大容量の背面収納を新設しました。

### 動線の改善

シンク、コンロ、冷蔵庫の配置を見直し、料理中の動線がスムーズになりました。

## お客様の声

> 「収納が増えて、キッチンがすっきりしました。料理するのが楽しくなりました！」

---

キッチンリフォームをご検討の方は、ぜひお気軽にご相談ください。`,
    category: 'case_study',
    ai_generated: true,
    published_at: '2024-01-05',
    featured_image: null,
  },
];

const categoryLabels: Record<string, string> = {
  news: 'ニュース',
  column: 'コラム',
  case_study: '施工事例',
};

// 関連記事を取得
function getRelatedPosts(currentSlug: string, category: string, limit: number = 3) {
  return blogPosts
    .filter((post) => post.slug !== currentSlug && post.category === category)
    .slice(0, limit);
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(post.slug, post.category);

  return (
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
                post.category === 'case_study'
                  ? 'bg-[#26A69A] text-white'
                  : post.category === 'column'
                  ? 'bg-[#FAF9F6] text-[#666666] border border-[#E5E4E0]'
                  : 'bg-[#333333] text-white'
              }`}>
                {categoryLabels[post.category] || post.category}
              </span>
              {post.ai_generated && (
                <span className="inline-flex items-center bg-[#E0F2F1] text-[#26A69A] text-xs font-medium px-2.5 py-1 rounded">
                  <Sparkles className="mr-1 h-3 w-3" />
                  AI生成
                </span>
              )}
            </div>

            <h1 className="text-2xl lg:text-4xl font-medium text-[#333333] leading-relaxed mb-6">
              {post.title}
            </h1>

            <div className="flex items-center justify-between text-sm text-[#999999]">
              <span className="flex items-center">
                <Calendar className="mr-1.5 h-4 w-4" />
                {new Date(post.published_at).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
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
          {/* Featured image placeholder */}
          <div className="aspect-video bg-[#E5E4E0] rounded-xl mb-12 flex items-center justify-center text-[#999999]">
            準備中
          </div>

          {/* Article content */}
          <article className="prose-custom">
            {post.content.split('\n').map((line, index) => {
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
              <span className="text-sm text-[#999999] mr-2">タグ:</span>
              {['リフォーム', 'キッチン', '施工事例'].map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-[#666666] bg-[#F0EFE9] px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
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
                  href="tel:048-XXX-XXXX"
                  className="inline-flex items-center justify-center border border-[#26A69A] text-[#26A69A] px-6 py-3 text-sm tracking-wide hover:bg-[#26A69A] hover:text-white transition-colors rounded-lg"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  048-XXX-XXXX
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
      {relatedPosts.length > 0 && (
        <section className="py-16 lg:py-24 bg-[#F0EFE9]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm tracking-widest text-[#26A69A] mb-4">RELATED</p>
              <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
                関連記事
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => (
                <article key={relatedPost.id} className="group">
                  <Link href={`/blog/${relatedPost.slug}`}>
                    <div className="relative aspect-[16/10] bg-[#E5E4E0] rounded-lg overflow-hidden mb-4">
                      <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                        準備中
                      </div>
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
                        {new Date(relatedPost.published_at).toLocaleDateString('ja-JP')}
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

// 静的生成用のパラメータ
export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}
