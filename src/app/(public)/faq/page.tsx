import Link from 'next/link';
import { Phone, ArrowRight } from 'lucide-react';

const faqCategories = [
  {
    title: 'お見積り・費用について',
    faqs: [
      {
        q: '見積りは無料ですか？',
        a: 'はい、現地調査・お見積りは無料で承っております。お見積り後のキャンセルも可能ですので、お気軽にご依頼ください。',
      },
      {
        q: 'リフォーム費用の支払い方法は？',
        a: '現金、銀行振込に対応しております。工事内容によっては分割でのお支払いも可能です。詳しくはお問い合わせください。',
      },
      {
        q: '追加費用が発生することはありますか？',
        a: 'お見積り時にしっかりと現地調査を行い、可能な限り追加費用が発生しないよう努めております。万が一、解体後に予期せぬ問題が見つかった場合は、事前にご説明・ご相談の上で対応いたします。',
      },
    ],
  },
  {
    title: '工事期間について',
    faqs: [
      {
        q: 'どのくらいの期間で工事が完了しますか？',
        a: '工事内容により異なります。目安として、水回りリフォーム（キッチン・浴室など）は1週間〜2週間、内装リフォームは数日〜1週間、フルリノベーションは1〜2ヶ月程度です。',
      },
      {
        q: '住みながらの工事は可能ですか？',
        a: 'はい、多くの場合は住みながらの工事が可能です。工事箇所によっては一時的に使用できない期間がありますが、ご不便を最小限に抑える工程をご提案いたします。',
      },
      {
        q: '土日・祝日の工事は可能ですか？',
        a: 'ご希望に応じて対応可能です。ただし、音が出る作業については近隣への配慮から平日をおすすめすることもあります。',
      },
    ],
  },
  {
    title: '対応範囲について',
    faqs: [
      {
        q: '小さな修繕でも対応してもらえますか？',
        a: 'はい、小さな修繕から大規模なリノベーションまで、幅広く対応しております。「こんなこと頼んでいいのかな」と思うような小さなお悩みでも、お気軽にご相談ください。',
      },
      {
        q: '対応エリアはどこまでですか？',
        a: '埼玉県さいたま市を中心に、東京都・埼玉県・千葉県の広いエリアに対応しております。詳しくはお問い合わせください。',
      },
      {
        q: '店舗や事務所のリフォームも対応していますか？',
        a: 'はい、住宅だけでなく店舗・事務所・テナントのリフォームも承っております。内装工事、設備工事など幅広く対応可能です。',
      },
    ],
  },
  {
    title: '施工について',
    faqs: [
      {
        q: '工事中の騒音や振動はどの程度ですか？',
        a: '解体作業や一部の施工では音や振動が発生します。作業前に近隣へのご挨拶を行い、作業時間の調整など配慮しながら進めます。',
      },
      {
        q: '工事後の保証はありますか？',
        a: 'はい、施工箇所に応じた保証をご用意しております。設備機器についてはメーカー保証も適用されます。詳しくはお見積り時にご説明いたします。',
      },
      {
        q: 'アフターフォローはありますか？',
        a: 'はい、工事完了後も何かあればお気軽にご連絡ください。定期的なメンテナンスのご相談も承っております。',
      },
    ],
  },
  {
    title: '打ち合わせ・進め方について',
    faqs: [
      {
        q: 'リフォームの進め方を教えてください',
        a: 'まずはお電話やメールでご相談ください。その後、現地調査・ヒアリング→お見積り→ご契約→工事→お引き渡しという流れになります。各段階で丁寧にご説明いたします。',
      },
      {
        q: 'デザインや仕様の相談はできますか？',
        a: 'はい、ご希望やライフスタイルをお伺いした上で、最適なプランをご提案いたします。カタログやサンプルをご用意しておりますので、実際に見て・触れて選んでいただけます。',
      },
      {
        q: '事前に完成イメージを確認できますか？',
        a: 'はい、必要に応じて簡易的なイメージ図やパース図をご用意することも可能です。過去の施工事例もご参考にしていただけます。',
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero section */}
      <section className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">FAQ</p>
            <h1 className="text-3xl lg:text-4xl font-medium leading-relaxed text-[#333333] mb-8">
              よくあるご質問
            </h1>
            <p className="text-[#666666] leading-relaxed">
              お客様からよくいただくご質問をまとめました。
              <br />
              こちらに載っていないご質問は、お気軽にお問い合わせください。
            </p>
          </div>
        </div>

        {/* Vertical text */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2">
          <p className="vertical-text text-2xl tracking-widest text-[#E5E4E0] font-medium">
            よくあるご質問
          </p>
        </div>
      </section>

      {/* FAQ categories */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          {faqCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-16 last:mb-0">
              <h2 className="text-xl font-medium text-[#333333] mb-6 pb-4 border-b border-[#E5E4E0]">
                {category.title}
              </h2>
              <div className="space-y-4">
                {category.faqs.map((faq, faqIndex) => (
                  <div
                    key={faqIndex}
                    className="bg-white rounded-xl p-6 shadow-sm"
                  >
                    <h3 className="text-[#333333] font-medium mb-3 flex items-start">
                      <span className="text-[#26A69A] mr-3 flex-shrink-0">
                        Q.
                      </span>
                      <span>{faq.q}</span>
                    </h3>
                    <p className="text-sm text-[#666666] leading-relaxed pl-7">
                      <span className="text-[#26A69A] mr-1">A.</span>
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="py-24 lg:py-32 bg-[#F0EFE9]">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">CONTACT</p>
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-6">
            解決しないお悩みは
            <br className="md:hidden" />
            お気軽にご相談ください
          </h2>
          <p className="text-[#666666] mb-12 leading-relaxed">
            ご質問やご不明点がございましたら、
            <br />
            お電話またはお問い合わせフォームよりご連絡ください。
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
