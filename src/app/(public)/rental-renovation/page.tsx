import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

export const metadata: Metadata = {
  title: '賃貸リノベーション・間取り変更',
  description:
    'さいたま市を中心に、賃貸住宅の間取り変更や内装リノベーションをご相談いただけます。現地を確認し、物件の状態・ご予算・今後の貸し方に合わせて工事内容を整理します。',
  openGraph: {
    title: '賃貸リノベーション・間取り変更 | SKコーム',
    description:
      '物件の状態と今後の貸し方を一緒に整理し、必要な工事と見送れる工事を分かりやすくご説明します。',
  },
};

const reviewPoints = [
  {
    title: '間取りと生活動線',
    description:
      '部屋数だけで決めず、玄関から室内への視線、収納、キッチンの使い方などを現地で確認します。',
  },
  {
    title: '傷みと更新時期',
    description:
      '見た目を整える工事と、下地・設備まで手を入れる工事を分け、今回どこまで行うかを整理します。',
  },
  {
    title: '予算と優先順位',
    description:
      'すべてを新しくする前提にはせず、入居者にとっての使いやすさと、オーナー様のご予算を照らして考えます。',
  },
];

const process = [
  {
    step: '01',
    title: 'ご相談',
    description:
      '空室期間、気になっている箇所、想定しているご予算など、分かる範囲でお聞かせください。',
  },
  {
    step: '02',
    title: '現地確認',
    description:
      '室内の状態や寸法、設備、構造上の制約を確認します。図面がなくてもご相談いただけます。',
  },
  {
    step: '03',
    title: '工事内容の整理',
    description:
      'できること・難しいこと、優先する工事、費用の考え方をお伝えし、お見積もりを作成します。',
  },
  {
    step: '04',
    title: '施工・ご報告',
    description:
      '内容にご納得いただいてから着工します。工事中は、進み具合を写真とともにお知らせします。',
  },
];

const strengths = [
  {
    icon: Wrench,
    title: '複数の工事をまとめて相談できます',
    description:
      '大工・内装・電気など、複数の工種が関わる工事も窓口を一本化します。内容に応じて自社施工と協力業者を組み合わせます。',
  },
  {
    icon: ClipboardCheck,
    title: '必要な工事から順に整理します',
    description:
      'ご希望とご予算を伺い、今行う工事、後からでもよい工事、今回は見送れる工事を分けてご説明します。',
  },
  {
    icon: ShieldCheck,
    title: '制約も先にお伝えします',
    description:
      '構造や法令の確認が必要な場合は、その理由をご説明します。必要に応じて設計事務所や専門業者と連携します。',
  },
  {
    icon: MessageCircle,
    title: '離れていても進捗を確認できます',
    description:
      '工事中は、節目ごとに現場写真をお送りします。気になる点があれば、その都度ご相談いただけます。',
  },
];

export default function RentalRenovationPage() {
  return (
    <div>
      <section className="bg-[#FAF9F6] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="mb-6 text-sm tracking-widest text-[#26A69A]">
            RENTAL RENOVATION
          </p>
          <h1 className="text-3xl font-medium leading-tight text-[#333333] lg:text-5xl">
            貸し方から一緒に考える、
            <br />
            賃貸リノベーション。
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#666666]">
            間取りを変えるべきか、設備だけ更新するべきか。
            <br className="hidden sm:block" />
            現地を確認し、物件の状態・ご予算・今後の貸し方に合わせて、必要な工事を整理します。
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="tel:090-3357-4379"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#26A69A] px-8 py-4 text-sm tracking-wide text-[#26A69A] transition-colors hover:bg-[#26A69A] hover:text-white"
            >
              <Phone className="h-4 w-4" />
              090-3357-4379
            </a>
            <a
              href="https://lin.ee/JDHT8YK"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#26A69A] px-8 py-4 text-sm tracking-wide text-white transition-colors hover:bg-[#009688]"
            >
              <MessageCircle className="h-4 w-4" />
              LINEで相談する
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[#F0EFE9] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="mb-4 text-sm tracking-widest text-[#26A69A]">
            BEFORE PLANNING
          </p>
          <h2 className="mb-6 text-2xl font-medium text-[#333333] lg:text-3xl">
            工事を決める前に、確認したいことがあります
          </h2>
          <p className="mb-12 max-w-3xl leading-relaxed text-[#666666]">
            空室の理由は、間取りだけとは限りません。立地、賃料、設備の状態、募集条件なども含めて考える必要があります。SKコームでは、工事で変えられる部分と、工事だけでは解決できない部分を分けてお話しします。
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {reviewPoints.map((point) => (
              <div key={point.title} className="rounded-xl bg-[#FAF9F6] p-8">
                <Search className="mb-5 h-6 w-6 text-[#26A69A]" />
                <h3 className="mb-3 text-lg font-medium text-[#333333]">
                  {point.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#666666]">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#FAF9F6] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="mb-4 text-sm tracking-widest text-[#26A69A]">
            WHAT WE CAN DO
          </p>
          <h2 className="mb-6 text-2xl font-medium text-[#333333] lg:text-3xl">
            物件ごとに、工事の組み合わせを考えます
          </h2>
          <p className="mb-12 max-w-3xl leading-relaxed text-[#666666]">
            壁や床の仕上げ、間取り変更、キッチン・水回り、電気工事などをご相談いただけます。建物の状態によってできることが異なるため、現地を見ずに工事内容を決めることはありません。
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: '間取り・動線の見直し',
                description:
                  '部屋の使い方、収納、玄関からの視線などを確認し、暮らしやすい動線を検討します。',
              },
              {
                title: '内装・設備の更新',
                description:
                  '床・壁・天井の仕上げや、キッチン・水回り設備など、傷みと優先度に合わせて更新します。',
              },
              {
                title: '電気・大工工事',
                description:
                  '照明やコンセント、下地や建具など、内装と一緒に検討したい工事をまとめて整理します。',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-[#F0EFE9] p-8">
                <h3 className="mb-3 text-lg font-medium text-[#333333]">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#666666]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F0EFE9] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="mb-4 text-sm tracking-widest text-[#26A69A]">FLOW</p>
          <h2 className="mb-12 text-2xl font-medium text-[#333333] lg:text-3xl">
            ご相談から工事まで
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {process.map((item) => (
              <div key={item.step} className="rounded-xl bg-[#FAF9F6] p-6 lg:p-8">
                <span className="mb-4 block text-3xl font-light text-[#26A69A]">
                  {item.step}
                </span>
                <h3 className="mb-3 text-lg font-medium text-[#333333]">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#666666]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#FAF9F6] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="mb-4 text-sm tracking-widest text-[#26A69A]">
            OUR APPROACH
          </p>
          <h2 className="mb-12 text-2xl font-medium text-[#333333] lg:text-3xl">
            安心して判断していただくために
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {strengths.map((item) => (
              <div key={item.title} className="flex gap-5 rounded-xl bg-[#F0EFE9] p-8">
                <item.icon className="h-6 w-6 flex-shrink-0 text-[#26A69A]" />
                <div>
                  <h3 className="mb-2 text-lg font-medium text-[#333333]">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#666666]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F0EFE9] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="mb-4 text-sm tracking-widest text-[#26A69A]">FAQ</p>
          <h2 className="mb-12 text-2xl font-medium text-[#333333] lg:text-3xl">
            よくあるご質問
          </h2>

          <div className="max-w-3xl space-y-6">
            {[
              {
                question: '間取り変更が必要かどうか、まだ決めていません。',
                answer:
                  '決まっていない段階でご相談ください。現状のお困りごとを伺い、内装や設備の更新で足りるのか、間取りから見直す方がよいのかを一緒に整理します。',
              },
              {
                question: '構造上、壁を動かせないことはありますか？',
                answer:
                  'あります。建物の構造や配管の位置によって、変更できる範囲は異なります。現地と図面を確認し、専門家の確認が必要な場合は理由と進め方をご説明します。',
              },
              {
                question: '工事費や工期は、いつ分かりますか？',
                answer:
                  '現地確認後、ご希望と工事範囲を整理してからお見積もりと工程をご案内します。建物の状態や資材の納期により変わるため、確認前に一律の金額や期間はお約束していません。',
              },
              {
                question: '他社の見積もりがあっても相談できますか？',
                answer:
                  'はい。工事項目や金額の見方が分からない場合もご相談ください。SKコームへ依頼することを前提にせず、違いを整理してご説明します。',
              },
            ].map((item) => (
              <div key={item.question} className="rounded-xl bg-[#FAF9F6] p-6">
                <p className="mb-2 text-sm font-medium text-[#26A69A]">Q</p>
                <p className="mb-4 font-medium text-[#333333]">
                  {item.question}
                </p>
                <p className="mb-2 text-sm font-medium text-[#26A69A]">A</p>
                <p className="text-sm leading-relaxed text-[#666666]">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#FAF9F6] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <CheckCircle className="mx-auto mb-6 h-8 w-8 text-[#26A69A]" />
          <h2 className="mb-4 text-2xl font-medium text-[#333333] lg:text-3xl">
            まずは、物件のお困りごとをお聞かせください
          </h2>
          <p className="mx-auto mb-10 max-w-2xl leading-relaxed text-[#666666]">
            工事内容が決まっていなくても大丈夫です。ご相談・現地確認・お見積もりは無料です。物件の写真や図面があれば、LINEからお送りいただけます。
          </p>

          <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="tel:090-3357-4379"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#26A69A] px-8 py-4 text-sm tracking-wide text-[#26A69A] transition-colors hover:bg-[#26A69A] hover:text-white"
            >
              <Phone className="h-4 w-4" />
              090-3357-4379
            </a>
            <a
              href="https://lin.ee/JDHT8YK"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#26A69A] px-8 py-4 text-sm tracking-wide text-white transition-colors hover:bg-[#009688]"
            >
              <MessageCircle className="h-4 w-4" />
              LINEで相談する
            </a>
            <Link
              href="/contact?type=rental-renovation"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#333333] px-8 py-4 text-sm tracking-wide text-white transition-colors hover:bg-[#444444]"
            >
              お問い合わせフォーム
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="hidden flex-col items-center md:flex">
            <p className="mb-4 text-sm text-[#666666]">
              LINEの友だち追加はこちらから
            </p>
            <Image
              src="/line-qr.png"
              alt="SKコーム公式LINEのQRコード"
              width={128}
              height={128}
              className="rounded-lg"
            />
          </div>

          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-6 text-left sm:grid-cols-2">
            <div className="rounded-xl bg-[#F0EFE9] p-6">
              <p className="mb-1 text-xs text-[#999999]">電話受付</p>
              <p className="text-sm text-[#333333]">8:00〜19:00（日曜定休）</p>
            </div>
            <div className="rounded-xl bg-[#F0EFE9] p-6">
              <p className="mb-1 text-xs text-[#999999]">現地確認の範囲</p>
              <p className="text-sm text-[#333333]">
                さいたま市を中心に、埼玉県内・東京都内
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
