'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500 mb-4">Error</h1>
        <h2 className="text-2xl font-medium text-[#333333] mb-4">
          エラーが発生しました
        </h2>
        <p className="text-[#666666] mb-8">
          申し訳ありません。予期せぬエラーが発生しました。
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center bg-[#26A69A] text-white px-6 py-3 text-sm font-medium tracking-wide hover:bg-[#009688] transition-colors rounded-lg"
        >
          もう一度試す
        </button>
      </div>
    </div>
  );
}
