import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#26A69A] mb-4">404</h1>
        <h2 className="text-2xl font-medium text-[#333333] mb-4">
          ページが見つかりません
        </h2>
        <p className="text-[#666666] mb-8">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-[#26A69A] text-white px-6 py-3 text-sm font-medium tracking-wide hover:bg-[#009688] transition-colors rounded-lg"
        >
          トップページに戻る
        </Link>
      </div>
    </div>
  );
}
