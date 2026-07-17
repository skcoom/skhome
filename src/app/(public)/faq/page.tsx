import Link from 'next/link';
import { Phone, ArrowRight } from 'lucide-react';

const faqCategories = [
  {
    title: 'ご相談・お見積もりについて',
    faqs: [
      {
        q: '工事内容が決まっていなくても相談できますか？',
        a: 'はい。今困っていることや、これからどのように使いたいかをお聞かせください。現地を確認し、必要な工事を一緒に整理します。',
      },
      {
        q: '現地確認や見積もりに費用はかかりますか？',
        a: 'ご相談・現地確認・お見積もりは無料です。場所やご相談内容によって確認が必要な場合は、訪問前にお伝えします。',
      },
      {
        q: '他社の見積もりがあっても相談できますか？',
        a: 'はい。工事項目や金額の違いが分からない場合も、そのままお持ちください。SKコームへ依頼することを前提にせず、内容を整理してご説明します。',
      },
      {
        q: '工事の途中で費用が変わることはありますか？',
        a: '解体後に、事前には見えなかった傷みなどが見つかることがあります。追加の工事が必要な場合は、理由と費用をご説明し、ご確認いただいてから進めます。',
      },
    ],
  },
  {
    title: '工事の進め方について',
    faqs: [
      {
        q: '相談から工事まで、どのように進みますか？',
        a: 'ご相談後に現地を確認し、工事内容とお見積もりをご説明します。内容にご納得いただいてからご契約・着工へ進み、完成後にご確認いただきます。',
      },
      {
        q: '工事期間はいつ分かりますか？',
        a: '現地確認後、工事範囲と資材の納期を確認して工程をご案内します。建物の状態や工事内容によって異なるため、確認前に一律の期間はお約束していません。',
      },
      {
        q: '住みながら工事できますか？',
        a: '工事する場所や内容によって異なります。水回りが使えない期間や、音・ほこりの影響も含めて、現地確認後に無理のない進め方をご相談します。',
      },
      {
        q: '工事中の様子を確認できますか？',
        a: 'はい。現場へ来ることが難しい場合も、節目ごとに工事写真をお送りします。気になる点があれば、その都度ご相談いただけます。',
      },
    ],
  },
  {
    title: '対応範囲について',
    faqs: [
      {
        q: '小さな修繕でも対応してもらえますか？',
        a: 'はい。建具の調整や内装の補修など、小さな工事もご相談ください。内容と場所を確認し、対応方法をご案内します。',
      },
      {
        q: '対応エリアはどこまでですか？',
        a: 'さいたま市を中心に、埼玉県内・東京都内へ現地確認に伺います。場所と工事内容によって調整しますので、まずは所在地をお知らせください。',
      },
      {
        q: '店舗や事務所のリフォームも対応していますか？',
        a: 'はい。住宅や賃貸物件のほか、店舗・事務所の内装工事もご相談いただけます。営業日程や工事できる時間帯も伺って工程を検討します。',
      },
    ],
  },
  {
    title: '施工について',
    faqs: [
      {
        q: '工事中の騒音や振動はどの程度ですか？',
        a: '解体や大工工事などでは、音や振動が出ます。工事内容と時間帯を事前にご説明し、建物の管理規約や周辺環境を確認して進めます。',
      },
      {
        q: '間取りや壁は自由に変更できますか？',
        a: '建物の構造、配管、法令などにより、変更できない場合があります。現地と図面を確認し、専門家の確認が必要な場合は理由と進め方をご説明します。',
      },
      {
        q: '完成後に気になる点が見つかった場合は？',
        a: 'まずは状況が分かる写真とあわせてご連絡ください。施工箇所や設備ごとの条件を確認し、対応方法をご案内します。',
      },
    ],
  },
  {
    title: '仕様・ご希望について',
    faqs: [
      {
        q: 'デザインや仕様の相談はできますか？',
        a: 'はい。使い方やお好み、ご予算を伺い、選択肢をご案内します。希望に近い写真などがあれば、打ち合わせの際にお見せください。',
      },
      {
        q: '事前に完成イメージを確認できますか？',
        a: '工事内容に応じて、図面、仕様資料、サンプルなどで確認方法をご案内します。必要な資料と費用の有無は、お見積もり前にご説明します。',
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
              ご相談や工事の進め方について、よくあるご質問をまとめました。
              <br />
              建物の状態によって答えが変わることは、現地確認後にご説明します。
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
            ここにないご質問も、
            <br className="md:hidden" />
            そのままお聞かせください
          </h2>
          <p className="text-[#666666] mb-12 leading-relaxed">
            工事内容が決まっていない段階でも大丈夫です。
            <br />
            お電話またはお問い合わせフォームからご連絡ください。
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
              <ArrowRight className="ml-3 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
