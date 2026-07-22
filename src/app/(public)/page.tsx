import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: '株式会社SKコーム｜さいたま市東浦和の内装リフォーム・賃貸リノベーション',
  description: 'さいたま市を中心に、住宅・賃貸物件・店舗などの内装リフォームをご相談いただけます。現地を確認し、必要な工事・費用・制約を分かりやすくご説明します。',
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
      .replace('body{', '.approved-home{')
      // 初回表示で主要な文章が長時間空白にならないよう、承認済み演出の待ち時間だけ短縮する。
      .replace('calc(var(--i)*80ms + 1.5s)', 'calc(var(--i)*45ms + .15s)')
      .replaceAll('var(--ease) 2.9s', 'var(--ease) .55s')
      .replaceAll('var(--ease) 2.6s', 'var(--ease) .4s')
      .replaceAll('var(--ease) 3.4s', 'var(--ease) .75s')
      .replace('animation-delay:3.1s', 'animation-delay:.7s'),
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
        className="approved-home st-2k booted"
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
