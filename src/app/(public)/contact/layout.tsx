import type { Metadata } from 'next';
import { generateFAQData, generateBreadcrumbData } from '@/lib/structured-data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: '住宅・賃貸物件・店舗などの内装リフォームについて、工事内容が決まっていない段階からご相談いただけます。ご相談・現地確認・お見積もりは無料です。',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'お問い合わせ | SKコーム',
    description: '工事内容が決まっていない段階からご相談いただけます。ご相談・現地確認・お見積もりは無料です。',
    type: 'website',
    url: `${siteUrl}/contact`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'お問い合わせ | SKコーム',
    description: '工事内容が決まっていない段階からご相談いただけます。',
  },
};

// FAQ構造化データ
const faqData = generateFAQData([
  {
    question: '現地確認や見積もりに費用はかかりますか？',
    answer: 'ご相談・現地確認・お見積もりは無料です。場所やご相談内容によって確認が必要な場合は、訪問前にお伝えします。',
  },
  {
    question: 'どのくらいの期間で工事が完了しますか？',
    answer: '現地確認後、工事範囲と資材の納期を確認して工程をご案内します。建物の状態や工事内容によって期間は異なります。',
  },
  {
    question: '住みながらの工事は可能ですか？',
    answer: '工事する場所や内容によって異なります。水回りが使えない期間や、音・ほこりの影響も含めて、現地確認後に進め方をご相談します。',
  },
  {
    question: '小さな修繕でも対応してもらえますか？',
    answer: 'はい。建具の調整や内装の補修など、小さな工事もご相談ください。内容と場所を確認してご案内します。',
  },
]);

// パンくずリスト構造化データ
const breadcrumbData = generateBreadcrumbData([
  { name: 'ホーム', url: '/' },
  { name: 'お問い合わせ', url: '/contact' },
]);

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      {children}
    </>
  );
}
