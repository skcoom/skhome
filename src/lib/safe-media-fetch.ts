const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export type SupportedImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

function approvedMediaUrl(rawUrl: string): URL {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('画像保存先が設定されていません');

  const configuredOrigin = new URL(supabaseUrl).origin;
  const url = new URL(rawUrl);
  const allowedPathPrefixes = [
    '/storage/v1/object/public/project-media/',
    '/storage/v1/render/image/public/project-media/',
    '/storage/v1/object/sign/project-media-private/',
    '/storage/v1/render/image/sign/project-media-private/',
  ];

  if (
    url.origin !== configuredOrigin
    || url.username
    || url.password
    || !allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    throw new Error('管理システムに保存された画像だけを解析できます');
  }

  return url;
}

async function readWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) throw new Error('画像データを読み込めませんでした');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error('画像のファイルサイズが上限を超えています');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

export async function fetchApprovedImage(
  rawUrl: string,
  options: { maxBytes?: number; timeoutMs?: number } = {},
): Promise<{ base64: string; mediaType: SupportedImageType }> {
  const maxBytes = options.maxBytes ?? 8 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const url = approvedMediaUrl(rawUrl);

  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'image/jpeg,image/png,image/webp,image/gif' },
  });
  if (!response.ok) throw new Error('画像を読み込めませんでした');

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw new Error('画像のファイルサイズが上限を超えています');

  const mediaType = response.headers.get('content-type')?.split(';')[0].trim() || '';
  if (!ALLOWED_IMAGE_TYPES.has(mediaType)) {
    throw new Error('対応していない画像形式です');
  }

  const bytes = await readWithLimit(response, maxBytes);
  if (bytes.byteLength === 0) throw new Error('画像データが空です');

  return {
    base64: bytes.toString('base64'),
    mediaType: mediaType as SupportedImageType,
  };
}
