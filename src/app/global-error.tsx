'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-red-500 mb-4">Error</h1>
            <h2 className="text-2xl font-medium text-gray-800 mb-4">
              エラーが発生しました
            </h2>
            <p className="text-gray-600 mb-8">
              申し訳ありません。予期せぬエラーが発生しました。
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              もう一度試す
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
