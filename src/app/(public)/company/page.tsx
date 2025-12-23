import { MapPin, Phone, Mail, Clock, Building2, User } from 'lucide-react';
import Link from 'next/link';

export default function CompanyPage() {
  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero section */}
      <section className="relative py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm tracking-widest text-[#26A69A] mb-4">
                ABOUT US
              </p>
              <h1 className="text-3xl lg:text-4xl font-medium leading-relaxed text-[#333333] mb-8">
                つくり手が直接届ける、<br />
                信頼のリフォーム。
              </h1>
              <p className="text-[#666666] leading-relaxed mb-6">
                私たちSKコームは、埼玉県さいたま市を拠点に、
                リフォーム・内装工事を手がける会社です。
              </p>
              <p className="text-[#666666] leading-relaxed">
                「つくり手が直接お客様と向き合う」をモットーに、
                中間マージンのない適正価格と、
                細部までこだわった丁寧な施工をお届けしています。
              </p>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] bg-gradient-to-br from-[#E5E4E0] to-[#D5D4D0] rounded-lg overflow-hidden">
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-[#FAF9F6] rounded-full flex items-center justify-center mb-3">
                    <Building2 className="w-10 h-10 text-[#999999]" />
                  </div>
                  <span className="text-xs text-[#999999] tracking-wider">SK-KOMU</span>
                </div>
              </div>
              {/* Accent badge */}
              <div className="absolute -bottom-6 -left-6 lg:-left-12">
                <div className="w-28 h-28 bg-[#26A69A] rounded-full flex items-center justify-center text-center">
                  <div className="text-xs font-medium text-white leading-tight">
                    Since<br />
                    2021
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical text */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2">
          <p className="vertical-text text-2xl tracking-widest text-[#E5E4E0] font-medium">
            会社概要
          </p>
        </div>
      </section>

      {/* Philosophy section */}
      <section className="py-24 lg:py-32 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">PHILOSOPHY</p>
            <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
              私たちの想い
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-[#FAF9F6] rounded-xl p-8 lg:p-12">
              <p className="text-[#666666] leading-loose text-center mb-8">
                住まいは、人生の大切な時間を過ごす場所。<br />
                だからこそ、私たちは一つひとつの現場に<br />
                真摯に向き合います。
              </p>
              <p className="text-[#666666] leading-loose text-center mb-8">
                大手にはできない小回りの良さと、<br />
                職人が直接対応するからこその細やかな気配り。<br />
                お客様の「こうしたい」を、カタチにします。
              </p>
              <p className="text-[#666666] leading-loose text-center">
                暮らしの「つづき」をつくる。<br />
                それが、私たちSKコームの仕事です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CEO Message section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <div className="aspect-[3/4] bg-gradient-to-b from-[#E5E4E0] to-[#D5D4D0] rounded-lg overflow-hidden">
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-[#FAF9F6] rounded-full flex items-center justify-center mb-4">
                    <User className="w-12 h-12 text-[#999999]" />
                  </div>
                  <span className="text-xs text-[#999999] tracking-wider">代表取締役</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7">
              <p className="text-sm tracking-widest text-[#26A69A] mb-4">MESSAGE</p>
              <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-8">
                代表挨拶
              </h2>
              <div className="space-y-6 text-[#666666] leading-relaxed">
                <p>
                  私はパソコンとインターネットが好きで、オタクのように触り続けてきた人間です。
                </p>
                <p>
                  一方、父は現場が好きで、長年内装の仕事をしてきました。その背中を見て「自分も大工になりたい」と働き始めた若者もいます。
                </p>
                <p>
                  私たちの会社は、正反対の人間が一緒にやっています。だからこそ、インターネットを使って情報をきちんと届けることも、現場で手を動かして仕上げることも、どちらも本気でやれます。
                </p>
                <p>
                  リフォームは何度も経験するものではありません。だから、何が妥当な金額なのか、判断しづらいのは当然です。
                </p>
                <p>
                  他の業者さんで見積もりを取った後でも構いません。「この金額、高いのか安いのかわからない」「本当にこの工事は必要なのか」——そう思ったら、一度話を聞かせてください。うちに頼むかどうかは、その後で決めてもらえれば大丈夫です。
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-[#E5E4E0]">
                <p className="text-sm text-[#999999] mb-1">代表取締役</p>
                <p className="text-xl font-medium text-[#333333]">末武修平</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Info section */}
      <section className="py-24 lg:py-32 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">COMPANY</p>
            <h2 className="text-2xl lg:text-3xl font-medium text-[#333333]">
              会社情報
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-[#FAF9F6] rounded-xl overflow-hidden">
              <table className="w-full">
                <tbody>
                  {[
                    ['会社名', '株式会社SKコーム'],
                    ['代表者', '末武 修平'],
                    ['設立', '2021年3月'],
                    ['資本金', '100万円'],
                    ['事業内容', '内装リフォーム'],
                    ['所在地', '〒336-0926 埼玉県さいたま市緑区東浦和8-2-12'],
                    ['電話番号', '048-711-1359'],
                    ['メール', 'info@skcoom.co.jp'],
                    ['営業時間', '8:00〜19:00（日曜定休）'],
                  ].map(([label, value], index) => (
                    <tr key={label} className={index !== 0 ? 'border-t border-[#E5E4E0]' : ''}>
                      <th className="px-6 lg:px-8 py-5 text-left text-sm font-medium text-[#26A69A] bg-[#FAF9F6] w-1/4 lg:w-1/5">
                        {label}
                      </th>
                      <td className="px-6 lg:px-8 py-5 text-sm text-[#333333]">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Access section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <p className="text-sm tracking-widest text-[#26A69A] mb-4">ACCESS</p>
              <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-8">
                アクセス
              </h2>

              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-[#E0F2F1] rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <MapPin className="h-5 w-5 text-[#26A69A]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#333333] mb-1">所在地</p>
                    <p className="text-[#666666] text-sm">
                      〒336-0926<br />
                      埼玉県さいたま市緑区東浦和8-2-12
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-[#E0F2F1] rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <Phone className="h-5 w-5 text-[#26A69A]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#333333] mb-1">電話番号</p>
                    <p className="text-[#666666] text-sm">048-711-1359</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-[#E0F2F1] rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <Mail className="h-5 w-5 text-[#26A69A]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#333333] mb-1">メール</p>
                    <p className="text-[#666666] text-sm">info@skcoom.co.jp</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-10 h-10 bg-[#E0F2F1] rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <Clock className="h-5 w-5 text-[#26A69A]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#333333] mb-1">営業時間</p>
                    <p className="text-[#666666] text-sm">8:00〜19:00（日曜定休）</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {/* Map */}
              <div className="aspect-[4/3] bg-gradient-to-br from-[#E5E4E0] to-[#D5D4D0] rounded-lg overflow-hidden">
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-[#FAF9F6] rounded-full flex items-center justify-center mb-3">
                    <MapPin className="w-8 h-8 text-[#26A69A]" />
                  </div>
                  <span className="text-sm text-[#666666]">埼玉県さいたま市緑区</span>
                  <span className="text-xs text-[#999999] mt-1">東浦和8-2-12</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-[#666666]">
                JR武蔵野線「東浦和駅」より徒歩5分
              </p>
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
