import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Phone, ArrowRight, CheckCircle, Clock, Shield, Wrench, MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: '賃貸リノベーション | 空室対策・間取り変更 | SKコーム',
  description:
    '空室の原因は家賃ではなく、部屋の作り。昭和の間取りを今の暮らしに合わせて変えれば、家賃を上げても埋まります。設計料ゼロ・自社施工・2年回収設計。埼玉県の賃貸リノベーションはSKコームへ。',
  openGraph: {
    title: '賃貸リノベーション | 空室対策・間取り変更 | SKコーム',
    description:
      '空室の原因は家賃ではなく、部屋の作り。昭和の間取りを今の暮らしに合わせて変えれば、家賃を上げても埋まります。',
  },
}

export default function RentalRenovationPage() {
  return (
    <div>
      {/* ===== Hero ===== */}
      <section className="bg-[#FAF9F6] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-sm tracking-widest text-[#26A69A] mb-6">
            RENTAL RENOVATION
          </p>
          <h1 className="text-3xl lg:text-5xl font-medium text-[#333333] leading-tight">
            空室の原因は、家賃じゃない。
          </h1>
          <p className="mt-4 text-xl lg:text-2xl font-medium text-[#666666] leading-relaxed">
            暮らし方が変わったのに、部屋が昭和のまま。
          </p>
          <p className="mt-6 text-base text-[#666666] leading-relaxed max-w-2xl">
            今の暮らしに合わせて変えれば、家賃を上げても埋まります。
            <br />
            現場を見て最適な形をご提案し、2年で回収できる予算で施工します。
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a
              href="tel:048-873-5765"
              className="inline-flex items-center justify-center gap-2 border border-[#26A69A] text-[#26A69A] px-8 py-4 rounded-lg text-sm tracking-wide transition-colors hover:bg-[#26A69A] hover:text-white"
            >
              <Phone className="w-4 h-4" />
              048-873-5765
            </a>
            <a
              href="https://lin.ee/JDHT8YK"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#26A69A] text-white px-8 py-4 rounded-lg text-sm tracking-wide transition-colors hover:bg-[#009688]"
            >
              <MessageCircle className="w-4 h-4" />
              LINEで相談する
            </a>
          </div>
        </div>
      </section>

      {/* ===== なぜ空室が続くのか ===== */}
      <section className="bg-[#F0EFE9] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">
            WHY VACANCY
          </p>
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-12">
            なぜ、空室が続くのか
          </h2>

          <div className="space-y-8 max-w-3xl">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#26A69A] text-white flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#333333] mb-2">
                  暮らし方が変わった
                </h3>
                <p className="text-[#666666] leading-relaxed">
                  少子化で1〜2人世帯が主流になりました。昭和の2Kや1Kは「家族が各部屋に分かれる」前提の設計で、1〜2人で住むには使いにくい間取りです。
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#26A69A] text-white flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#333333] mb-2">
                  構造的な問題が残っている
                </h3>
                <p className="text-[#666666] leading-relaxed">
                  玄関から室内が丸見え、音が漏れる、断熱性能が低く冬寒く夏暑い、動線が悪い。これらは壁紙や設備を新しくしても解消されない、建物の構造に起因する問題です。
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#26A69A] text-white flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#333333] mb-2">
                  表面だけのリフォームでは選ばれない
                </h3>
                <p className="text-[#666666] leading-relaxed">
                  同じ家賃なら、入居者は「広いリビングと独立した寝室があり、遮音性・断熱性が高い物件」を選びます。壁紙を貼り替えても、構造的なミスマッチは解消されません。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 私たちの提案 ===== */}
      <section className="bg-[#FAF9F6] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">
            OUR APPROACH
          </p>
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-6">
            今の暮らしに合わせて、部屋を変える
          </h2>
          <p className="text-[#666666] leading-relaxed max-w-3xl mb-12">
            SKコームは、現場を見て、その物件に最適な形をご提案します。間取り変更、遮音・断熱対策、動線改善、設備更新を組み合わせて、今の入居者に選ばれる部屋に変えます。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-[#F0EFE9] rounded-xl p-8">
              <h3 className="text-lg font-medium text-[#333333] mb-3">
                間取り変更
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                2Kを1LDKに、3LDKを2LDKに。部屋数を減らしてリビングを広く取り、居住区と共用スペースを分離します。部屋数が減っても、家賃は上がります。
              </p>
            </div>
            <div className="bg-[#F0EFE9] rounded-xl p-8">
              <h3 className="text-lg font-medium text-[#333333] mb-3">
                遮音・断熱対策
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                玄関に扉を1枚設けて居住エリアを確保。外の音が室内に、室内の音が外に漏れる問題を解消し、断熱性能も改善します。
              </p>
            </div>
            <div className="bg-[#F0EFE9] rounded-xl p-8">
              <h3 className="text-lg font-medium text-[#333333] mb-3">
                動線・設備の刷新
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                対面キッチン化、生活動線の最適化、見た目の刷新。今の入居者が求める「使いやすさ」と「見た目の良さ」を両立します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 施工事例 ===== */}
      <section className="bg-[#F0EFE9] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">
            CASE STUDY
          </p>
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-12">
            施工事例
          </h2>

          <div className="bg-[#FAF9F6] rounded-2xl p-8 lg:p-12">
            <h3 className="text-xl font-medium text-[#333333] mb-2">
              クレーヌ吉沼 301号室
            </h3>
            <p className="text-sm text-[#666666] mb-8">
              木造アパート・昭和期建築 / 2K → 1LDK へ間取り変更
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <p className="text-xs text-[#999999] mb-1">工事費</p>
                <p className="text-2xl font-medium text-[#333333]">300<span className="text-base">万円</span></p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#999999] mb-1">家賃</p>
                <p className="text-2xl font-medium text-[#26A69A]">
                  +17,000<span className="text-base">円/月</span>
                </p>
                <p className="text-xs text-[#999999]">78,000 → 95,000円</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#999999] mb-1">工期</p>
                <p className="text-2xl font-medium text-[#333333]">35<span className="text-base">日</span></p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#999999] mb-1">入居</p>
                <p className="text-2xl font-medium text-[#333333]">工事中<span className="text-base">に決定</span></p>
              </div>
            </div>

            <div className="border-t border-[#E5E4E0] pt-6">
              <p className="text-sm text-[#666666] leading-relaxed">
                工事費は約2年で回収。設計士を入れず現場で直接ご提案し、設計料ゼロで施工しました。同規模の工事を大手リフォーム会社に依頼した場合、約500万円の予算感になります。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SKコームが選ばれる理由 ===== */}
      <section className="bg-[#FAF9F6] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">
            WHY SK COOM
          </p>
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-12">
            SKコームが選ばれる理由
          </h2>

          <div className="space-y-8 max-w-3xl">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <Wrench className="w-6 h-6 text-[#26A69A]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#333333] mb-2">
                  現場で即判断、設計料ゼロ
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  大手は設計士を入れて図面作成から始めますが、SKコームは現場で構造を判断し、その場で最適な間取りをご提案します。設計料が発生しないため、その分を施工の質に充てられます。
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <Clock className="w-6 h-6 text-[#26A69A]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#333333] mb-2">
                  自社施工で工期を圧縮
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  設備工事以外は全て自社社員で施工。外注業者の都合による工程待ちが発生せず、1日の中で柔軟に工程を組めるため、工期を短縮できます。空室期間が短い分、オーナー様の機会損失を抑えます。
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <Shield className="w-6 h-6 text-[#26A69A]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#333333] mb-2">
                  2年で回収できる予算設計
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  工事費を家賃収入の2年分以内で回収できるよう、周辺相場を調査した上で予算を設計します。無駄な解体をせず、入居者が求めるポイントに予算を集中。大手の約4割安で施工します。
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-[#26A69A]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#333333] mb-2">
                  5〜10年、メンテナンス不要
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  表面だけのリフォームは数年で再工事が必要です。SKコームは構造から変えるため、5〜10年先までリノベーション不要で安定した入居がつきます。トータルコストで見れば、表層リフォームの繰り返しより経済的です。
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-[#26A69A]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#333333] mb-2">
                  工事中はLINEで進捗報告
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed">
                  日々の工程と現場の進行状況をLINEで工事写真とともにお送りします。現場に来られなくても、安心して工事をお任せいただけます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 比較表 ===== */}
      <section className="bg-[#F0EFE9] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">
            COMPARISON
          </p>
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-12">
            表層リフォームとの違い
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full bg-[#FAF9F6] rounded-xl overflow-hidden">
              <thead>
                <tr className="border-b border-[#E5E4E0]">
                  <th className="text-left p-4 lg:p-6 text-sm font-medium text-[#999999] w-1/4"></th>
                  <th className="text-left p-4 lg:p-6 text-sm font-medium text-[#999999] w-[37.5%]">
                    表層リフォーム
                  </th>
                  <th className="text-left p-4 lg:p-6 text-sm font-medium text-[#26A69A] w-[37.5%]">
                    SKコームのリノベーション
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-[#E5E4E0]">
                  <td className="p-4 lg:p-6 font-medium text-[#333333]">目的</td>
                  <td className="p-4 lg:p-6 text-[#666666]">すぐに貸し出す</td>
                  <td className="p-4 lg:p-6 text-[#333333]">5〜10年安定して入居がつく</td>
                </tr>
                <tr className="border-b border-[#E5E4E0]">
                  <td className="p-4 lg:p-6 font-medium text-[#333333]">内容</td>
                  <td className="p-4 lg:p-6 text-[#666666]">壁紙・設備交換</td>
                  <td className="p-4 lg:p-6 text-[#333333]">間取り・遮音・断熱・動線・設備</td>
                </tr>
                <tr className="border-b border-[#E5E4E0]">
                  <td className="p-4 lg:p-6 font-medium text-[#333333]">家賃</td>
                  <td className="p-4 lg:p-6 text-[#666666]">現状維持</td>
                  <td className="p-4 lg:p-6 text-[#26A69A] font-medium">現状以上に設定可能</td>
                </tr>
                <tr className="border-b border-[#E5E4E0]">
                  <td className="p-4 lg:p-6 font-medium text-[#333333]">再工事</td>
                  <td className="p-4 lg:p-6 text-[#666666]">数年後に再度必要</td>
                  <td className="p-4 lg:p-6 text-[#333333]">5〜10年不要</td>
                </tr>
                <tr>
                  <td className="p-4 lg:p-6 font-medium text-[#333333]">設計料</td>
                  <td className="p-4 lg:p-6 text-[#666666]">不要（軽微な工事のため）</td>
                  <td className="p-4 lg:p-6 text-[#26A69A] font-medium">不要（現場で即提案）</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== よくあるご質問 ===== */}
      <section className="bg-[#FAF9F6] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">FAQ</p>
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-12">
            よくあるご質問
          </h2>

          <div className="space-y-6 max-w-3xl">
            <div className="bg-[#F0EFE9] rounded-xl p-6">
              <p className="text-sm font-medium text-[#26A69A] mb-2">Q</p>
              <p className="font-medium text-[#333333] mb-4">
                部屋数を減らしたら、貸しにくくなりませんか？
              </p>
              <p className="text-sm font-medium text-[#26A69A] mb-2">A</p>
              <p className="text-sm text-[#666666] leading-relaxed">
                現在、賃貸市場で最も売れ残っているのが昭和期の2Kや1Kです。1〜2人世帯が主流の今、細かく区切られた部屋より、広いリビングと独立した寝室がある間取りが選ばれます。部屋数が減っても、家賃は現状維持以上に設定できます。
              </p>
            </div>

            <div className="bg-[#F0EFE9] rounded-xl p-6">
              <p className="text-sm font-medium text-[#26A69A] mb-2">Q</p>
              <p className="font-medium text-[#333333] mb-4">
                設計士を入れなくて大丈夫ですか？
              </p>
              <p className="text-sm font-medium text-[#26A69A] mb-2">A</p>
              <p className="text-sm text-[#666666] leading-relaxed">
                RC造・鉄骨造のマンションでは室内壁は構造壁ではないため、安全に撤去・変更が可能です。木造の場合は、天井裏・床裏の実地調査と建築図面を照合し、構造に関わる柱を判別した上で間取りをご提案します。建築許可が必要な工事の場合は、協力設計事務所と連携して対応します。
              </p>
            </div>

            <div className="bg-[#F0EFE9] rounded-xl p-6">
              <p className="text-sm font-medium text-[#26A69A] mb-2">Q</p>
              <p className="font-medium text-[#333333] mb-4">
                300万円は高くないですか？
              </p>
              <p className="text-sm font-medium text-[#26A69A] mb-2">A</p>
              <p className="text-sm text-[#666666] leading-relaxed">
                同規模の間取り変更を大手リフォーム会社に依頼すると、約500万円が相場です。SKコームは設計料が不要で、自社施工により中間マージンも発生しないため、業界水準の約4割安で対応しています。さらに、2年で回収できる予算設計をご提案します。
              </p>
            </div>

            <div className="bg-[#F0EFE9] rounded-xl p-6">
              <p className="text-sm font-medium text-[#26A69A] mb-2">Q</p>
              <p className="font-medium text-[#333333] mb-4">
                工事期間中の空室はもったいなくないですか？
              </p>
              <p className="text-sm font-medium text-[#26A69A] mb-2">A</p>
              <p className="text-sm text-[#666666] leading-relaxed">
                表層リフォームで早く貸し出しても、数年後に再工事が必要です。SKコームのリノベーションは工期約35日で、5〜10年メンテナンス不要。トータルの空室期間と費用で比較すると、一度の工事でしっかり変える方が経済的です。これまでの施工実績では、工事完了から2ヶ月以上空室になったケースはありません。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-[#F0EFE9] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="text-2xl lg:text-3xl font-medium text-[#333333] mb-4">
            まずは現地を見て、無料でご提案します
          </h2>
          <p className="text-[#666666] leading-relaxed mb-10 max-w-2xl mx-auto">
            物件の状態を拝見した上で、最適なリノベーション内容と概算をその場でお伝えします。お見積りは無料です。お気軽にお問い合わせください。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href="tel:048-873-5765"
              className="inline-flex items-center justify-center gap-2 border border-[#26A69A] text-[#26A69A] px-8 py-4 rounded-lg text-sm tracking-wide transition-colors hover:bg-[#26A69A] hover:text-white"
            >
              <Phone className="w-4 h-4" />
              048-873-5765
            </a>
            <a
              href="https://lin.ee/JDHT8YK"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#26A69A] text-white px-8 py-4 rounded-lg text-sm tracking-wide transition-colors hover:bg-[#009688]"
            >
              <MessageCircle className="w-4 h-4" />
              LINEで相談する
            </a>
            <Link
              href="/contact?type=rental-renovation"
              className="inline-flex items-center justify-center gap-2 bg-[#333333] text-white px-8 py-4 rounded-lg text-sm tracking-wide transition-colors hover:bg-[#444444]"
            >
              お問い合わせフォーム
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* LINE QR - PC only */}
          <div className="hidden md:flex flex-col items-center">
            <p className="text-sm text-[#666666] mb-4">
              LINEでのお問い合わせはこちらのQRコードからも友だち追加できます
            </p>
            <Image
              src="/line-qr.png"
              alt="LINE QRコード"
              width={128}
              height={128}
              className="rounded-lg"
            />
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto text-left">
            <div className="bg-[#FAF9F6] rounded-xl p-6">
              <p className="text-xs text-[#999999] mb-1">営業時間</p>
              <p className="text-sm text-[#333333]">8:00 〜 18:00（日祝休み）</p>
            </div>
            <div className="bg-[#FAF9F6] rounded-xl p-6">
              <p className="text-xs text-[#999999] mb-1">対応エリア</p>
              <p className="text-sm text-[#333333]">埼玉県全域</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
