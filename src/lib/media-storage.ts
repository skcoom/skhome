import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectMedia } from '@/types/database';

export const PRIVATE_MEDIA_BUCKET = 'project-media-private';
export const PUBLIC_MEDIA_BUCKET = 'project-media';
export const MEDIA_SIGNED_URL_TTL_SECONDS = 15 * 60;

export function internalMediaUrl(path: string): string {
  return `internal://${PRIVATE_MEDIA_BUCKET}/${path}`;
}

export function publicStoragePath(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const marker = `/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/`;
    if (!url.pathname.startsWith(marker)) return null;
    return decodeURIComponent(url.pathname.slice(marker.length));
  } catch {
    return null;
  }
}

function isProjectMediaPath(projectId: string, path: string): boolean {
  return path.startsWith(`${projectId}/`) && !path.includes('../');
}

export async function signPrivateMedia(
  supabase: SupabaseClient,
  media: ProjectMedia,
): Promise<ProjectMedia> {
  if (!media.private_storage_path) return media;

  const bucket = media.private_storage_bucket || PRIVATE_MEDIA_BUCKET;
  const paths = [media.private_storage_path, media.private_thumbnail_path].filter(
    (path): path is string => Boolean(path),
  );
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, MEDIA_SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    return { ...media, file_url: '', thumbnail_url: undefined };
  }

  const signedByPath = new Map(data.map((item) => [item.path, item.signedUrl]));
  return {
    ...media,
    file_url: signedByPath.get(media.private_storage_path) || '',
    thumbnail_url: media.private_thumbnail_path
      ? signedByPath.get(media.private_thumbnail_path) || undefined
      : undefined,
  };
}

async function copyObject(
  supabase: SupabaseClient,
  sourceBucket: string,
  targetBucket: string,
  path: string,
): Promise<void> {
  const { data, error: downloadError } = await supabase.storage.from(sourceBucket).download(path);
  if (downloadError || !data) throw downloadError || new Error('写真を読み込めませんでした');

  const { error: uploadError } = await supabase.storage
    .from(targetBucket)
    .upload(path, new Uint8Array(await data.arrayBuffer()), {
      contentType: data.type || undefined,
      upsert: true,
    });
  if (uploadError) throw uploadError;
}

export async function createPrivateMediaCopy(
  supabase: SupabaseClient,
  media: ProjectMedia,
): Promise<Pick<ProjectMedia, 'private_storage_bucket' | 'private_storage_path' | 'private_thumbnail_path' | 'private_large_path'>> {
  if (media.private_storage_path) {
    return {
      private_storage_bucket: media.private_storage_bucket || PRIVATE_MEDIA_BUCKET,
      private_storage_path: media.private_storage_path,
      private_thumbnail_path: media.private_thumbnail_path,
      private_large_path: media.private_large_path,
    };
  }

  const sourcePath = publicStoragePath(media.file_url);
  if (!sourcePath || !isProjectMediaPath(media.project_id, sourcePath)) {
    throw new Error('非公開原本へ移行できない写真です');
  }
  const thumbnailPath = publicStoragePath(media.thumbnail_url);
  if (thumbnailPath && !isProjectMediaPath(media.project_id, thumbnailPath)) {
    throw new Error('非公開原本へ移行できないサムネイルです');
  }
  await copyObject(supabase, PUBLIC_MEDIA_BUCKET, PRIVATE_MEDIA_BUCKET, sourcePath);
  if (thumbnailPath && thumbnailPath !== sourcePath) {
    await copyObject(supabase, PUBLIC_MEDIA_BUCKET, PRIVATE_MEDIA_BUCKET, thumbnailPath);
  }

  const inferredLargePath = sourcePath.includes('_medium.')
    ? sourcePath.replace('_medium.', '_large.')
    : null;
  let privateLargePath: string | null = null;
  if (inferredLargePath) {
    try {
      await copyObject(supabase, PUBLIC_MEDIA_BUCKET, PRIVATE_MEDIA_BUCKET, inferredLargePath);
      privateLargePath = inferredLargePath;
    } catch {
      // 旧データには高解像度版がない場合がある。画面表示用原本を優先して続行する。
    }
  }

  return {
    private_storage_bucket: PRIVATE_MEDIA_BUCKET,
    private_storage_path: sourcePath,
    private_thumbnail_path: thumbnailPath,
    private_large_path: privateLargePath,
  };
}

export async function createPublicMediaCopy(
  supabase: SupabaseClient,
  media: ProjectMedia,
): Promise<Pick<ProjectMedia, 'file_url' | 'thumbnail_url' | 'public_storage_path' | 'public_thumbnail_path'>> {
  if (!media.private_storage_path) {
    return {
      file_url: media.file_url,
      thumbnail_url: media.thumbnail_url,
      public_storage_path: media.public_storage_path || publicStoragePath(media.file_url),
      public_thumbnail_path: media.public_thumbnail_path || publicStoragePath(media.thumbnail_url),
    };
  }

  if (
    !isProjectMediaPath(media.project_id, media.private_storage_path)
    || (media.private_thumbnail_path && !isProjectMediaPath(media.project_id, media.private_thumbnail_path))
  ) {
    throw new Error('別の現場の写真は公開できません');
  }

  const sourceBucket = media.private_storage_bucket || PRIVATE_MEDIA_BUCKET;
  await copyObject(supabase, sourceBucket, PUBLIC_MEDIA_BUCKET, media.private_storage_path);
  if (media.private_thumbnail_path) {
    await copyObject(supabase, sourceBucket, PUBLIC_MEDIA_BUCKET, media.private_thumbnail_path);
  }

  const fileUrl = supabase.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(media.private_storage_path).data.publicUrl;
  const thumbnailUrl = media.private_thumbnail_path
    ? supabase.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(media.private_thumbnail_path).data.publicUrl
    : undefined;

  return {
    file_url: fileUrl,
    thumbnail_url: thumbnailUrl,
    public_storage_path: media.private_storage_path,
    public_thumbnail_path: media.private_thumbnail_path,
  };
}

export async function removePublicMediaCopies(
  supabase: SupabaseClient,
  media: ProjectMedia,
): Promise<void> {
  const paths = [
    media.public_storage_path || publicStoragePath(media.file_url),
    media.public_thumbnail_path || publicStoragePath(media.thumbnail_url),
    media.private_storage_path,
    media.private_thumbnail_path,
    media.private_large_path,
    publicStoragePath(media.file_url)?.includes('_medium.')
      ? publicStoragePath(media.file_url)?.replace('_medium.', '_large.')
      : null,
  ].filter((path): path is string => Boolean(path));
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PUBLIC_MEDIA_BUCKET).remove([...new Set(paths)]);
  if (error) throw error;
}

export async function removePrivateMediaCopies(
  supabase: SupabaseClient,
  media: ProjectMedia,
): Promise<void> {
  const paths = [
    media.private_storage_path,
    media.private_thumbnail_path,
    media.private_large_path,
  ].filter((path): path is string => Boolean(path));
  if (paths.length === 0) return;
  const bucket = media.private_storage_bucket || PRIVATE_MEDIA_BUCKET;
  const { error } = await supabase.storage.from(bucket).remove([...new Set(paths)]);
  if (error) throw error;
}
