import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';

export default function HomePage() {
  const featuredWorks = [
    {
      id: '1',
      name: '大橋邸 キッチンリフォーム',
      category: 'リフォーム',
      description: 'システムキッチンの入れ替えと背面収納の新設',
      image: '/placeholder-work-1.jpg',
    },
    {
      id: '2',
      name: '東京医療商事 事務所内装',
      category: 'リフォーム',
      description: '事務所全体の内装リニューアル',
      image: '/placeholder-work-2.jpg',
    },
    {
      id: '3',
      name: '浦安 マンションリノベーション',
      category: 'マンション',
      description: '3LDKマンションのフルリノベーション',
      image: '/placeholder-work-3.jpg',
    },
  ];

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

            {/* Center/Right images */}
            <div className="lg:col-span-7 relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                      施工写真
                    </div>
                  </div>
                  <div className="aspect-square bg-[#E5E4E0] rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                      施工写真
                    </div>
                  </div>
                </div>
                <div className="pt-12">
                  <div className="aspect-[3/4] bg-[#E5E4E0] rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                      施工写真
                    </div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {featuredWorks.map((work) => (
              <Link
                key={work.id}
                href={`/works/${work.id}`}
                className="group"
              >
                <div className="relative aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden mb-4">
                  <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                    準備中
                  </div>
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
                <p className="text-sm text-[#666666]">{work.description}</p>
              </Link>
            ))}
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            <Link href="/blog/urayasu-kitchen-remodel" className="group flex gap-6">
              <div className="w-32 h-24 bg-[#E5E4E0] rounded-lg flex-shrink-0 flex items-center justify-center text-[#999999] text-xs">
                準備中
              </div>
              <div className="flex-1">
                <span className="inline-block bg-[#26A69A] text-white text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                  施工事例
                </span>
                <h3 className="text-base font-medium text-[#333333] group-hover:text-[#26A69A] transition-colors mb-1">
                  浦安マンション キッチンリフォーム完了
                </h3>
                <p className="text-xs text-[#999999]">2024.01.15</p>
              </div>
            </Link>

            <Link href="/blog/remodel-tips-5" className="group flex gap-6">
              <div className="w-32 h-24 bg-[#E5E4E0] rounded-lg flex-shrink-0 flex items-center justify-center text-[#999999] text-xs">
                準備中
              </div>
              <div className="flex-1">
                <span className="inline-block bg-[#FAF9F6] text-[#666666] text-xs font-medium px-2 py-0.5 rounded-full mb-2 border border-[#E5E4E0]">
                  コラム
                </span>
                <h3 className="text-base font-medium text-[#333333] group-hover:text-[#26A69A] transition-colors mb-1">
                  リフォームで失敗しないためのポイント5選
                </h3>
                <p className="text-xs text-[#999999]">2024.01.08</p>
              </div>
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
              href="tel:048-XXX-XXXX"
              className="inline-flex items-center justify-center border border-[#26A69A] text-[#26A69A] px-8 py-4 text-sm tracking-wide hover:bg-[#26A69A] hover:text-white transition-colors"
            >
              <Phone className="mr-3 h-4 w-4" />
              048-XXX-XXXX
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
