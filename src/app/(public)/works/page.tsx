'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone } from 'lucide-react';

const categoryLabels: Record<string, string> = {
  all: 'すべて',
  remodeling: 'リフォーム',
  apartment: 'マンション',
  new_construction: '新築',
  house: '住宅',
};

const works = [
  {
    id: '1',
    name: '大橋邸 キッチンリフォーム',
    category: 'remodeling',
    address: '東京都世田谷区',
    description: 'システムキッチンの入れ替えと背面収納の新設。使いやすさと収納力を両立した、明るく開放的なキッチン空間を実現しました。',
    year: '2024',
  },
  {
    id: '2',
    name: '東京医療商事 事務所内装',
    category: 'remodeling',
    address: '東京都中央区',
    description: '事務所全体の内装リニューアル。壁紙・床・照明の交換により、清潔感のある快適なオフィス空間に生まれ変わりました。',
    year: '2024',
  },
  {
    id: '3',
    name: '浦安 マンションリノベーション',
    category: 'apartment',
    address: '千葉県浦安市',
    description: '3LDKマンションのフルリノベーション。間取り変更を含む大規模改修で、ご家族のライフスタイルに合わせた住まいを実現。',
    year: '2023',
  },
  {
    id: '4',
    name: '浅草橋 新築工事',
    category: 'new_construction',
    address: '東京都台東区',
    description: '店舗併用住宅の新築工事。1階を店舗、2・3階を住居とした、デザインと機能性を両立した建物です。',
    year: '2023',
  },
  {
    id: '5',
    name: '川口市 戸建てリフォーム',
    category: 'house',
    address: '埼玉県川口市',
    description: '築30年の戸建て住宅の全面リフォーム。断熱改修も同時に行い、快適で省エネな住まいに生まれ変わりました。',
    year: '2023',
  },
  {
    id: '6',
    name: '草加市 マンション内装',
    category: 'apartment',
    address: '埼玉県草加市',
    description: '中古マンション購入後の内装リフォーム。クロス・フローリング・建具の交換で、新築同様の仕上がりに。',
    year: '2022',
  },
];

export default function WorksPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredWorks = activeCategory === 'all'
    ? works
    : works.filter((work) => work.category === activeCategory);

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

      {/* Category filter */}
      <section className="py-8 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
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

      {/* Works grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {filteredWorks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredWorks.map((work) => (
                <Link
                  key={work.id}
                  href={`/works/${work.id}`}
                  className="group"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden mb-4">
                    <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                      準備中
                    </div>
                    {/* Category badge */}
                    <div className="absolute top-4 left-4">
                      <span className="inline-block bg-[#26A69A] text-white text-xs font-medium px-3 py-1 rounded-full">
                        {categoryLabels[work.category]}
                      </span>
                    </div>
                    {/* Year badge */}
                    <div className="absolute top-4 right-4">
                      <span className="inline-block bg-white/90 text-[#666666] text-xs font-medium px-2 py-1 rounded">
                        {work.year}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <p className="text-xs text-[#999999]">{work.address}</p>
                    <h2 className="text-lg font-medium text-[#333333] group-hover:text-[#26A69A] transition-colors">
                      {work.name}
                    </h2>
                    <p className="text-sm text-[#666666] line-clamp-2">
                      {work.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-[#999999]">該当する施工実績がありません</p>
            </div>
          )}
        </div>
      </section>

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
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
