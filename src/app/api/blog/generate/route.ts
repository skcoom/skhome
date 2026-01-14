import { NextRequest, NextResponse } from 'next/server';
import { generateEnhancedBlogPost } from '@/lib/claude/client';
import { requirePermission } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import type { EnhancedProjectData, DocumentSummary, PhotoInfo } from '@/types/blog-generation';
import type { Project, ProjectDocument, ProjectMedia, ProjectTag } from '@/types/database';

interface RequestBody {
  projectId: string;
}

// プロジェクト関連情報を収集
async function collectProjectData(projectId: string): Promise<EnhancedProjectData> {
  const supabase = await createClient();

  // プロジェクト基本情報を取得
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw new Error('プロジェクトが見つかりません');
  }

  const typedProject = project as Project;

  // ドキュメント情報を取得
  const { data: documents } = await supabase
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId);

  // 写真情報を取得
  const { data: media } = await supabase
    .from('project_media')
    .select('*')
    .eq('project_id', projectId)
    .eq('type', 'image');

  // ドキュメント要約を整形
  const documentSummaries: DocumentSummary[] = [];
  if (documents && documents.length > 0) {
    for (const doc of documents as ProjectDocument[]) {
      if (doc.ai_summary) {
        try {
          const summary = JSON.parse(doc.ai_summary) as Record<string, unknown>;
          documentSummaries.push({
            documentType: doc.document_type,
            extractedData: {
              name: summary.name as string | undefined,
              client_name: summary.client_name as string | undefined,
              address: summary.address as string | undefined,
              tags: summary.tags as ProjectTag[] | undefined,
              description: summary.description as string | undefined,
              start_date: summary.start_date as string | undefined,
              end_date: summary.end_date as string | undefined,
            },
          });
        } catch {
          // JSON パースエラーは無視
        }
      }
    }
  }

  // 写真情報を整形
  const typedMedia = (media || []) as ProjectMedia[];
  const beforePhotos = typedMedia.filter((m) => m.phase === 'before');
  const duringPhotos = typedMedia.filter((m) => m.phase === 'during');
  const afterPhotos = typedMedia.filter((m) => m.phase === 'after');
  const featuredPhotos = typedMedia
    .filter((m) => m.is_featured)
    .map((m) => ({
      phase: m.phase,
      caption: m.caption || undefined,
    }));

  const photoInfo: PhotoInfo = {
    beforeCount: beforePhotos.length,
    duringCount: duringPhotos.length,
    afterCount: afterPhotos.length,
    featuredPhotos,
    hasBeforeAfter: beforePhotos.length > 0 && afterPhotos.length > 0,
  };

  // EnhancedProjectData を構築
  return {
    name: typedProject.name,
    tags: typedProject.tags || [],
    clientName: typedProject.client_name || undefined,
    address: typedProject.address || undefined,
    description: typedProject.description || undefined,
    publicDescription: typedProject.public_description || undefined,
    startDate: typedProject.start_date || undefined,
    endDate: typedProject.end_date || undefined,
    documentSummaries,
    photoInfo,
  };
}

// ブログ記事生成（AI機能: スタッフ以上、Rate Limit適用）
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 権限チェック
    const { user, error: authError } = await requirePermission('ai:use');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    // Rate Limitチェック（ユーザーIDベース）
    const rateLimitResult = await checkRateLimit(
      `ai:blogGenerate:${user.id}`,
      RATE_LIMITS.ai
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'AI機能の利用回数が上限に達しました。しばらく経ってからお試しください。' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          },
        }
      );
    }

    const body = (await request.json()) as RequestBody;
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'プロジェクトIDは必須です' },
        { status: 400 }
      );
    }

    // プロジェクト関連情報を収集
    const projectData = await collectProjectData(projectId);

    // Claude APIで拡張版ブログ記事を生成
    const generatedPost = await generateEnhancedBlogPost(projectData);

    return NextResponse.json(generatedPost);
  } catch (error) {
    console.error('Blog generation error:', error);

    if (error instanceof Error) {
      if (error.message === 'ANTHROPIC_API_KEY is not set') {
        return NextResponse.json(
          { error: 'APIキーが設定されていません。環境変数ANTHROPIC_API_KEYを設定してください。' },
          { status: 500 }
        );
      }
      if (error.message === 'プロジェクトが見つかりません') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'ブログ記事の生成に失敗しました' },
      { status: 500 }
    );
  }
}
