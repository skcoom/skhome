import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: 'SKコームの個人情報保護方針について。お客様の個人情報の取り扱いについてご説明いたします。',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">
            PRIVACY POLICY
          </p>
          <h1 className="text-3xl lg:text-4xl font-medium text-[#333333] mb-8">
            プライバシーポリシー
          </h1>
          <p className="text-[#666666] leading-relaxed">
            株式会社SKコーム（以下「当社」といいます）は、お客様の個人情報の重要性を認識し、
            その保護を徹底することが社会的責務であると考え、以下のとおり個人情報保護方針を定めます。
          </p>
        </div>
      </section>

      {/* Content section */}
      <section className="py-16 lg:py-24 bg-[#F0EFE9]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="space-y-12">
            {/* 1. 個人情報の定義 */}
            <div>
              <h2 className="text-xl font-medium text-[#333333] mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#26A69A] text-white text-sm rounded-full flex items-center justify-center mr-3">1</span>
                個人情報の定義
              </h2>
              <div className="bg-[#FAF9F6] rounded-lg p-6 lg:p-8">
                <p className="text-[#666666] leading-relaxed">
                  「個人情報」とは、生存する個人に関する情報であって、当該情報に含まれる氏名、
                  住所、電話番号、メールアドレスその他の記述等により特定の個人を識別することができるものをいいます。
                </p>
              </div>
            </div>

            {/* 2. 個人情報の収集 */}
            <div>
              <h2 className="text-xl font-medium text-[#333333] mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#26A69A] text-white text-sm rounded-full flex items-center justify-center mr-3">2</span>
                個人情報の収集
              </h2>
              <div className="bg-[#FAF9F6] rounded-lg p-6 lg:p-8">
                <p className="text-[#666666] leading-relaxed mb-4">
                  当社は、以下の場合に個人情報を収集することがあります。
                </p>
                <ul className="list-disc list-inside text-[#666666] space-y-2">
                  <li>お問い合わせフォームからのご連絡時</li>
                  <li>お見積りのご依頼時</li>
                  <li>工事のご契約時</li>
                  <li>アフターサービスのご提供時</li>
                </ul>
              </div>
            </div>

            {/* 3. 個人情報の利用目的 */}
            <div>
              <h2 className="text-xl font-medium text-[#333333] mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#26A69A] text-white text-sm rounded-full flex items-center justify-center mr-3">3</span>
                個人情報の利用目的
              </h2>
              <div className="bg-[#FAF9F6] rounded-lg p-6 lg:p-8">
                <p className="text-[#666666] leading-relaxed mb-4">
                  収集した個人情報は、以下の目的で利用いたします。
                </p>
                <ul className="list-disc list-inside text-[#666666] space-y-2">
                  <li>お問い合わせへの回答</li>
                  <li>お見積りの作成・ご提案</li>
                  <li>工事の施工・管理</li>
                  <li>アフターサービスのご提供</li>
                  <li>当社サービスに関するご案内</li>
                  <li>サービス向上のための統計データ作成</li>
                </ul>
              </div>
            </div>

            {/* 4. 個人情報の第三者提供 */}
            <div>
              <h2 className="text-xl font-medium text-[#333333] mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#26A69A] text-white text-sm rounded-full flex items-center justify-center mr-3">4</span>
                個人情報の第三者提供
              </h2>
              <div className="bg-[#FAF9F6] rounded-lg p-6 lg:p-8">
                <p className="text-[#666666] leading-relaxed mb-4">
                  当社は、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。
                </p>
                <ul className="list-disc list-inside text-[#666666] space-y-2">
                  <li>お客様の同意がある場合</li>
                  <li>法令に基づく場合</li>
                  <li>人の生命、身体または財産の保護のために必要な場合</li>
                  <li>業務委託先に対して必要な範囲で開示する場合（機密保持契約を締結のうえ）</li>
                </ul>
              </div>
            </div>

            {/* 5. 個人情報の安全管理 */}
            <div>
              <h2 className="text-xl font-medium text-[#333333] mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#26A69A] text-white text-sm rounded-full flex items-center justify-center mr-3">5</span>
                個人情報の安全管理
              </h2>
              <div className="bg-[#FAF9F6] rounded-lg p-6 lg:p-8">
                <p className="text-[#666666] leading-relaxed">
                  当社は、個人情報の漏洩、滅失またはき損の防止その他の個人情報の安全管理のために、
                  必要かつ適切な措置を講じます。また、従業員に対して個人情報保護に関する教育・啓発を行い、
                  個人情報の適切な取り扱いを徹底いたします。
                </p>
              </div>
            </div>

            {/* 6. 個人情報の開示・訂正・削除 */}
            <div>
              <h2 className="text-xl font-medium text-[#333333] mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#26A69A] text-white text-sm rounded-full flex items-center justify-center mr-3">6</span>
                個人情報の開示・訂正・削除
              </h2>
              <div className="bg-[#FAF9F6] rounded-lg p-6 lg:p-8">
                <p className="text-[#666666] leading-relaxed">
                  お客様がご自身の個人情報の開示、訂正、削除等を希望される場合は、
                  下記のお問い合わせ窓口までご連絡ください。ご本人確認のうえ、
                  合理的な期間内に対応いたします。
                </p>
              </div>
            </div>

            {/* 7. Cookieの使用について */}
            <div>
              <h2 className="text-xl font-medium text-[#333333] mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#26A69A] text-white text-sm rounded-full flex items-center justify-center mr-3">7</span>
                Cookieの使用について
              </h2>
              <div className="bg-[#FAF9F6] rounded-lg p-6 lg:p-8">
                <p className="text-[#666666] leading-relaxed mb-4">
                  当社ウェブサイトでは、サービス向上のためにCookie（クッキー）を使用しています。
                  Cookieとは、ウェブサイトがお客様のブラウザに送信する小さなデータファイルで、
                  以下の目的で使用されます。
                </p>
                <ul className="list-disc list-inside text-[#666666] space-y-2">
                  <li>ウェブサイトの利用状況の分析（Google Analytics）</li>
                  <li>ウェブサイトの機能向上</li>
                </ul>
                <p className="text-[#666666] leading-relaxed mt-4">
                  ブラウザの設定により、Cookieの受け入れを拒否することができますが、
                  一部のサービスが正常に機能しなくなる場合があります。
                </p>
              </div>
            </div>

            {/* 8. アクセス解析ツールについて */}
            <div>
              <h2 className="text-xl font-medium text-[#333333] mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#26A69A] text-white text-sm rounded-full flex items-center justify-center mr-3">8</span>
                アクセス解析ツールについて
              </h2>
              <div className="bg-[#FAF9F6] rounded-lg p-6 lg:p-8">
                <p className="text-[#666666] leading-relaxed mb-4">
                  当社ウェブサイトでは、Googleによるアクセス解析ツール「Google Analytics」を使用しています。
                  Google Analyticsはデータの収集のためにCookieを使用しています。
                  このデータは匿名で収集されており、個人を特定するものではありません。
                </p>
                <p className="text-[#666666] leading-relaxed">
                  この機能はCookieを無効にすることで収集を拒否することができますので、
                  お使いのブラウザの設定をご確認ください。
                  Google Analyticsの利用規約及びプライバシーポリシーについては、
                  Googleのウェブサイトをご確認ください。
                </p>
              </div>
            </div>

            {/* 9. プライバシーポリシーの変更 */}
            <div>
              <h2 className="text-xl font-medium text-[#333333] mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#26A69A] text-white text-sm rounded-full flex items-center justify-center mr-3">9</span>
                プライバシーポリシーの変更
              </h2>
              <div className="bg-[#FAF9F6] rounded-lg p-6 lg:p-8">
                <p className="text-[#666666] leading-relaxed">
                  当社は、法令の変更や事業内容の変更等に伴い、本プライバシーポリシーを改定することがあります。
                  改定した場合は、当ウェブサイトに掲載することでお知らせいたします。
                </p>
              </div>
            </div>

            {/* 10. お問い合わせ窓口 */}
            <div>
              <h2 className="text-xl font-medium text-[#333333] mb-4 flex items-center">
                <span className="w-8 h-8 bg-[#26A69A] text-white text-sm rounded-full flex items-center justify-center mr-3">10</span>
                お問い合わせ窓口
              </h2>
              <div className="bg-[#FAF9F6] rounded-lg p-6 lg:p-8">
                <p className="text-[#666666] leading-relaxed mb-4">
                  個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。
                </p>
                <div className="border-t border-[#E5E4E0] pt-4 mt-4">
                  <p className="text-[#333333] font-medium mb-2">株式会社SKコーム</p>
                  <p className="text-[#666666] text-sm">
                    〒336-0926 埼玉県さいたま市緑区東浦和8-2-12<br />
                    電話：048-711-1359<br />
                    メール：info@skcoom.co.jp
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 制定日 */}
          <div className="mt-12 text-right">
            <p className="text-[#666666] text-sm">
              制定日：2024年1月1日<br />
              最終改定日：2024年12月20日
            </p>
          </div>
        </div>
      </section>

      {/* Back to top */}
      <section className="py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-[#26A69A] hover:text-[#009688] transition-colors"
          >
            <span className="mr-2">←</span>
            トップページに戻る
          </Link>
        </div>
      </section>
    </div>
  );
}
