import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicBucket = 'project-media';
const privateBucket = 'project-media-private';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function publicPath(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const marker = `/storage/v1/object/public/${publicBucket}/`;
    if (!url.pathname.startsWith(marker)) return null;
    return decodeURIComponent(url.pathname.slice(marker.length));
  } catch {
    return null;
  }
}

function belongsToProject(projectId, path) {
  return path.startsWith(`${projectId}/`) && !path.includes('../');
}

function internalUrl(path) {
  return `internal://${privateBucket}/${path}`;
}

function inferredLargePath(path) {
  return path.includes('_medium.') ? path.replace('_medium.', '_large.') : null;
}

async function copyObject(path, required) {
  if (!path) return null;
  const { data, error: downloadError } = await supabase.storage.from(publicBucket).download(path);
  if (downloadError || !data) {
    if (required) throw downloadError || new Error('download failed');
    return null;
  }
  const { error: uploadError } = await supabase.storage
    .from(privateBucket)
    .upload(path, new Uint8Array(await data.arrayBuffer()), {
      contentType: data.type || undefined,
      upsert: true,
    });
  if (uploadError) throw uploadError;
  return path;
}

const { data: mediaRows, error: fetchError } = await supabase
  .from('project_media')
  .select('id, project_id, type, file_url, thumbnail_url, publication_status, private_storage_path')
  .eq('source_origin', 'manual')
  .is('private_storage_path', null)
  .order('created_at');
if (fetchError) throw fetchError;

const candidates = (mediaRows || []).map((media) => ({
  media,
  sourcePath: publicPath(media.file_url),
  thumbnailPath: publicPath(media.thumbnail_url),
}));
const movable = candidates.filter(({ media, sourcePath, thumbnailPath }) => (
  sourcePath
  && belongsToProject(media.project_id, sourcePath)
  && (!thumbnailPath || belongsToProject(media.project_id, thumbnailPath))
));
const summary = {
  found: candidates.length,
  movable: movable.length,
  skipped: candidates.length - movable.length,
  internal: movable.filter(({ media }) => media.publication_status !== 'published').length,
  published: movable.filter(({ media }) => media.publication_status === 'published').length,
};

if (!apply) {
  console.log(JSON.stringify({ mode: 'dry-run', ...summary }, null, 2));
  console.log('実行する場合だけ、同じ環境変数で npm run migrate:private-media -- --apply を実行してください。');
  process.exit(0);
}

let moved = 0;
let failed = 0;
let publicCleanupFailed = 0;

for (const { media, sourcePath, thumbnailPath } of movable) {
  const uploadedPrivatePaths = [];
  try {
    const privateSourcePath = await copyObject(sourcePath, true);
    if (privateSourcePath) uploadedPrivatePaths.push(privateSourcePath);
    const privateThumbnailPath = thumbnailPath && thumbnailPath !== sourcePath
      ? await copyObject(thumbnailPath, false)
      : thumbnailPath;
    if (privateThumbnailPath && privateThumbnailPath !== privateSourcePath) {
      uploadedPrivatePaths.push(privateThumbnailPath);
    }
    const privateLargePath = await copyObject(inferredLargePath(sourcePath), false);
    if (privateLargePath) uploadedPrivatePaths.push(privateLargePath);

    const published = media.publication_status === 'published';
    const { data: updated, error: updateError } = await supabase
      .from('project_media')
      .update({
        private_storage_bucket: privateBucket,
        private_storage_path: privateSourcePath,
        private_thumbnail_path: privateThumbnailPath,
        private_large_path: privateLargePath,
        file_url: published ? media.file_url : internalUrl(privateSourcePath),
        thumbnail_url: published
          ? media.thumbnail_url
          : privateThumbnailPath ? internalUrl(privateThumbnailPath) : null,
        public_storage_path: published ? sourcePath : null,
        public_thumbnail_path: published ? thumbnailPath : null,
      })
      .eq('id', media.id)
      .is('private_storage_path', null)
      .select('id')
      .single();
    if (updateError || !updated) throw updateError || new Error('database update failed');

    if (!published) {
      const publicPaths = [...new Set([sourcePath, thumbnailPath, inferredLargePath(sourcePath)].filter(Boolean))];
      const { error: deleteError } = await supabase.storage.from(publicBucket).remove(publicPaths);
      if (deleteError) publicCleanupFailed += 1;
    }
    moved += 1;
  } catch (error) {
    failed += 1;
    console.error(JSON.stringify({ mediaId: media.id, error: error instanceof Error ? error.message : 'unknown' }));
  }
}

// DB移行後に削除だけ失敗した場合も、再実行で公開コピーを回収できるよう再掃除する。
const { data: internalRows, error: internalFetchError } = await supabase
  .from('project_media')
  .select('id, private_storage_path, private_thumbnail_path, private_large_path')
  .eq('source_origin', 'manual')
  .or('publication_status.neq.published,publication_status.is.null')
  .not('private_storage_path', 'is', null);

if (internalFetchError) {
  publicCleanupFailed += 1;
  console.error(JSON.stringify({ stage: 'public-cleanup-fetch', error: internalFetchError.message }));
} else {
  for (const media of internalRows || []) {
    const paths = [...new Set([
      media.private_storage_path,
      media.private_thumbnail_path,
      media.private_large_path,
    ].filter(Boolean))];
    const { error } = await supabase.storage.from(publicBucket).remove(paths);
    if (error) {
      publicCleanupFailed += 1;
      console.error(JSON.stringify({ mediaId: media.id, stage: 'public-cleanup', error: error.message }));
    }
  }
}

console.log(JSON.stringify({ mode: 'apply', ...summary, moved, failed, publicCleanupFailed }, null, 2));
if (failed > 0 || publicCleanupFailed > 0) process.exitCode = 1;
