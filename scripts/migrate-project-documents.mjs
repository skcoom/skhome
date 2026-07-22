import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: documents, error: fetchError } = await supabase
  .from('project_documents')
  .select('id, project_id, file_url, storage_path')
  .is('storage_path', null)
  .order('created_at');

if (fetchError) throw fetchError;

const candidates = (documents || []).map((document) => {
  try {
    const url = new URL(document.file_url);
    const marker = '/storage/v1/object/public/project-media/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return { document, sourcePath: null };
    return {
      document,
      sourcePath: decodeURIComponent(url.pathname.slice(markerIndex + marker.length)),
    };
  } catch {
    return { document, sourcePath: null };
  }
});

const movable = candidates.filter((candidate) => candidate.sourcePath);
const skipped = candidates.length - movable.length;

if (!apply) {
  console.log(JSON.stringify({ mode: 'dry-run', found: candidates.length, movable: movable.length, skipped }, null, 2));
  console.log('実行する場合だけ、同じ環境変数で npm run migrate:private-documents -- --apply を実行してください。');
  process.exit(0);
}

let moved = 0;
let failed = 0;
let publicDeleteFailed = 0;

for (const candidate of movable) {
  const { document, sourcePath } = candidate;
  try {
    const { data: sourceFile, error: downloadError } = await supabase.storage
      .from('project-media')
      .download(sourcePath);
    if (downloadError || !sourceFile) throw downloadError || new Error('download failed');

    const bytes = new Uint8Array(await sourceFile.arrayBuffer());
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (signature !== '%PDF-' || bytes.byteLength > 20 * 1024 * 1024) {
      throw new Error('invalid PDF');
    }

    const targetPath = `${document.project_id}/${randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('project-documents')
      .upload(targetPath, bytes, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw uploadError;

    const { data: updated, error: updateError } = await supabase
      .from('project_documents')
      .update({
        file_url: targetPath,
        storage_bucket: 'project-documents',
        storage_path: targetPath,
      })
      .eq('id', document.id)
      .is('storage_path', null)
      .select('id')
      .single();

    if (updateError || !updated) {
      await supabase.storage.from('project-documents').remove([targetPath]);
      throw updateError || new Error('database update failed');
    }

    const { error: deleteError } = await supabase.storage.from('project-media').remove([sourcePath]);
    if (deleteError) publicDeleteFailed += 1;
    moved += 1;
  } catch {
    failed += 1;
  }
}

console.log(JSON.stringify({ mode: 'apply', moved, failed, skipped, publicDeleteFailed }, null, 2));
if (failed > 0 || publicDeleteFailed > 0) process.exitCode = 1;
