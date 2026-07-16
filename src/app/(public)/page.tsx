import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Script from 'next/script';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '株式会社SKコーム｜さいたま市東浦和の内装リフォーム・賃貸リノベーション',
  description: '図面の上ではなく、現場で決める工務店。内装リフォーム・賃貸アパートの間取り変更リノベーション・店舗内装。設計料ゼロ・自社施工・他社見積のセカンドオピニオン歓迎。',
};

function approvedHomeSource() {
  const sourcePath = path.join(process.cwd(), 'public', '_approved-home-source.html');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const style = source.match(/<style>([\s\S]*?)<\/style>/u)?.[1];
  const body = source.match(/<body[^>]*>([\s\S]*?)<\/body>/u)?.[1];
  const script = source.match(/<script>([\s\S]*?)<\/script>/u)?.[1];

  if (!style || !body || !script) {
    throw new Error('合意済みホームページの読み込みに失敗しました');
  }

  return {
    style: style
      .replaceAll('body::before', '.approved-home::before')
      .replaceAll('body::after', '.approved-home::after')
      .replace('body{', '.approved-home{'),
    body: body.replace(/<script>[\s\S]*?<\/script>/u, ''),
    script: script
      .replaceAll('document.body', 'document.getElementById("approvedHome")')
      .replace(
        'window.addEventListener("load", function(){\n  document.getElementById("approvedHome").classList.add("booted");\n});',
        'document.getElementById("approvedHome").classList.add("booted");',
      ),
  };
}

export default function HomePage() {
  const approved = approvedHomeSource();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: approved.style }} />
      <div
        id="approvedHome"
        className="approved-home st-2k"
        dangerouslySetInnerHTML={{ __html: approved.body }}
      />
      <Script
        id="approved-home-interactions"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: approved.script }}
      />
    </>
  );
}
