import fs from 'node:fs';
import path from 'node:path';
import { fetchApprovedImage } from '@/lib/safe-media-fetch';

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('外部レビュー指摘の再発防止', () => {
  it('AI画像解析は管理用ストレージ以外のURLを読み込まない', async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    try {
      await expect(fetchApprovedImage('http://127.0.0.1/internal')).rejects.toThrow(
        '管理システムに保存された画像だけを解析できます',
      );
    } finally {
      if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }
  });

  it.each([
    'src/app/api/media/process/route.ts',
    'src/app/api/media/video/route.ts',
    'src/app/api/blog/upload-image/route.ts',
  ])('%s はファイル本体を読む前に権限を確認する', (relativePath) => {
    const code = source(relativePath);
    expect(code).toContain('requirePermission(');
    expect(code.indexOf('requirePermission(')).toBeLessThan(code.indexOf('request.formData()'));
  });

  it('PDFは非公開バケットに保存し、期限付きURLでのみ閲覧する', () => {
    const code = source('src/app/api/projects/[id]/documents/route.ts');
    expect(code).toContain("const storageBucket = 'project-documents'");
    expect(code).toContain('.createSignedUrl(document.storage_path, 15 * 60)');
    expect(code).not.toContain(".from('project-media')\n      .upload(filePath, file");
  });

  it('公開施工実績は公開専用項目と公開確定写真だけを使う', () => {
    const listPage = source('src/app/(public)/works/page.tsx');
    const detailPage = source('src/app/(public)/works/[id]/page.tsx');

    for (const code of [listPage, detailPage]) {
      expect(code).toContain('public_title');
      expect(code).toContain('public_location');
      expect(code).toContain("publication_status === 'published'");
      expect(code).toContain(".not('public_reviewed_at', 'is', null)");
    }
    expect(detailPage).not.toContain('typedProject.description');
    expect(detailPage).not.toContain('typedProject.address');
  });

  it('RLSは協力会社を担当現場に限定し、原価と書類をスタッフから分離する', () => {
    const migration = source('supabase/migrations/20260722000000_security_review_remediation.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.project_members');
    expect(migration).toContain('Partners can view assigned projects');
    expect(migration).toContain('Staff can manage project documents');
    expect(migration).toContain('project_budgets_select_admin');
    expect(migration).toContain("publication_status = 'published'");
    expect(migration).toContain('REVOKE SELECT ON TABLE public.projects FROM anon');
    expect(migration).toContain('REVOKE SELECT ON TABLE public.project_media FROM anon');
    expect(migration).toContain('Admins can manage project assignments');
  });

  it('新しく登録した写真は、掲載操作を行うまで社内限定にする', () => {
    const route = source('src/app/api/projects/[id]/media/route.ts');
    expect(route).toContain("publication_status: 'internal'");
    expect(route).toContain('is_featured: true');
  });

  it.each([
    'src/app/api/profit-summary/route.ts',
    'src/app/api/projects/[id]/budget/route.ts',
    'src/app/api/settings/cost/route.ts',
  ])('%s は管理者権限をAPI入口で確認する', (relativePath) => {
    expect(source(relativePath)).toContain('requireAdmin()');
  });

  it.each([
    'src/app/api/suppliers/route.ts',
    'src/app/api/additional-works/route.ts',
    'src/app/api/projects/[id]/orders/route.ts',
    'src/app/api/projects/[id]/labor/route.ts',
  ])('%s はスタッフ権限をAPI入口で確認する', (relativePath) => {
    expect(source(relativePath)).toContain('requireStaff()');
  });

  it.each([
    'src/app/api/projects/[id]/orders/[orderId]/route.ts',
    'src/app/api/projects/[id]/labor/[laborId]/route.ts',
    'src/app/api/projects/[id]/progress/[progressId]/route.ts',
    'src/app/api/projects/[id]/additional-works/[workId]/route.ts',
  ])('%s は親現場IDでも更新対象を絞る', (relativePath) => {
    expect(source(relativePath)).toContain(".eq('project_id', projectId)");
  });

  it('お問い合わせ通知は正しい管理画面へ案内し、Discordへ送信しない', () => {
    const route = source('src/app/api/contacts/route.ts');
    const email = source('src/lib/email.ts');
    expect(email).toContain('${siteUrl}/admin/contacts');
    expect(route).not.toContain('sendDiscordNotification');
    expect(email).not.toContain('DISCORD_WEBHOOK_URL');
    expect(route).toContain('const contactId = randomUUID()');
    expect(route).not.toContain('.insert(sanitizedData)\n      .select()');
  });
});
