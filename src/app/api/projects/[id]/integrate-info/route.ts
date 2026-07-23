import { NextRequest, NextResponse } from 'next/server';
import { createClaudeClient } from '@/lib/claude/client';
import { requirePermission } from '@/lib/auth';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { analyzePhotosForProjectInfo, preparePhotosForAnalysis } from '@/lib/claude/photo-analyzer';
import type { Project, ProjectMedia, ProjectDocument, ProjectTag, ProjectStatus } from '@/types/database';
import type {
  IntegrationResponse,
  ProjectFieldsToIntegrate,
  InfoSource,
  PhotoAnalysisResult,
} from '@/types/info-integration';
import { signPrivateMedia } from '@/lib/media-storage';

const HP_DESCRIPTION_PROMPT = `あなたは建設会社のホームページに掲載する施工実績の説明文を作成するライターです。

## 情報
{INFO}

## 要件
1. お客様向けの魅力的な文章を作成
2. 施工のビフォーアフターや改善点を分かりやすく表現
3. 専門用語は避け、読みやすい文章に
4. 100-150文字程度

## 禁止事項
- 具体的な金額の記載
- 型番や品番の記載
- 施主の個人名の記載

## 出力
生成した説明文のみを出力してください。装飾や説明は不要です。`;

/**
 * HP用説明文を生成
 */
async function generatePublicDescription(
  claude: ReturnType<typeof createClaudeClient>,
  photoAnalysis: PhotoAnalysisResult | null,
  documentSummaries: string[],
  tags: ProjectTag[]
): Promise<string | null> {
  const infoLines: string[] = [];

  if (photoAnalysis?.constructionDetails) {
    infoLines.push(`施工内容: ${photoAnalysis.constructionDetails}`);
  }
  if (photoAnalysis?.buildingCharacteristics) {
    infoLines.push(`建物の特徴: ${photoAnalysis.buildingCharacteristics}`);
  }
  if (documentSummaries.length > 0) {
    infoLines.push(`ドキュメントからの情報:\n${documentSummaries.join('\n')}`);
  }
  if (tags.length > 0) {
    infoLines.push(`工事タグ: ${tags.join('、')}`);
  }

  if (infoLines.length === 0) {
    return null;
  }

  const prompt = HP_DESCRIPTION_PROMPT.replace('{INFO}', infoLines.join('\n'));

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return null;
  }

  return textContent.text.trim();
}

/**
 * プロジェクト情報の統合API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<IntegrationResponse>> {
  try {
    // 権限チェック
    const { user, error: authError } = await requirePermission('ai:use');
    if (authError || !user) {
      return NextResponse.json(
        { success: false, currentData: {} as ProjectFieldsToIntegrate, suggestedData: {} as ProjectFieldsToIntegrate, sources: [], error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    // レート制限チェック
    const rateLimitKey = `${user.id}:infoIntegration`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, RATE_LIMITS.infoIntegration);

    if (!rateLimitResult.success) {
      const resetDate = new Date(rateLimitResult.resetTime);
      return NextResponse.json(
        {
          success: false,
          currentData: {} as ProjectFieldsToIntegrate,
          suggestedData: {} as ProjectFieldsToIntegrate,
          sources: [],
          error: `利用制限に達しました。${resetDate.toLocaleTimeString('ja-JP')}以降に再度お試しください`,
        },
        { status: 429 }
      );
    }

    const { id: projectId } = await params;
    const supabase = await createClient();

    // プロジェクト情報を取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, currentData: {} as ProjectFieldsToIntegrate, suggestedData: {} as ProjectFieldsToIntegrate, sources: [], error: 'プロジェクトが見つかりません' },
        { status: 404 }
      );
    }

    const typedProject = project as Project;

    // メディア情報を取得
    const { data: mediaData } = await supabase
      .from('project_media')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'image');

    const admin = createAdminClient();
    const photos = await Promise.all(
      (((mediaData as ProjectMedia[] | null) || [])).map((item) => signPrivateMedia(admin, item)),
    );

    // ドキュメント情報を取得
    const { data: documentData } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId);

    const documents = (documentData as ProjectDocument[] | null) || [];

    // 現在のデータを整理
    const currentData: ProjectFieldsToIntegrate = {
      name: typedProject.name || null,
      client_name: typedProject.client_name || null,
      address: typedProject.address || null,
      tags: typedProject.tags || [],
      status: typedProject.status || null,
      start_date: typedProject.start_date || null,
      end_date: typedProject.end_date || null,
      description: typedProject.description || null,
      public_description: typedProject.public_description || null,
    };

    // 統合データとソースを初期化
    const suggestedData: ProjectFieldsToIntegrate = {
      name: null,
      client_name: null,
      address: null,
      tags: [],
      status: null,
      start_date: null,
      end_date: null,
      description: null,
      public_description: null,
    };
    const sources: InfoSource[] = [];

    const claude = createClaudeClient();

    // 写真分析
    let photoAnalysis: PhotoAnalysisResult | null = null;
    if (photos.length > 0) {
      try {
        const imageData = await preparePhotosForAnalysis(
          photos.map((p) => ({
            file_url: p.file_url,
            thumbnail_url: p.thumbnail_url || undefined,
            phase: p.phase,
          }))
        );

        if (imageData.length > 0) {
          photoAnalysis = await analyzePhotosForProjectInfo(claude, imageData);

          // 写真からの推測結果をマージ
          if (photoAnalysis.suggestedTags.length > 0) {
            suggestedData.tags = photoAnalysis.suggestedTags;
            sources.push({
              field: 'tags',
              source: 'photo',
              confidence: photoAnalysis.confidence,
              reason: `写真から${photoAnalysis.suggestedTags.join('、')}を推測`,
            });
          }

          if (photoAnalysis.constructionDetails) {
            // 施工詳細をdescriptionに追加候補として
            const descParts: string[] = [];
            descParts.push(`【施工内容】${photoAnalysis.constructionDetails}`);
            if (photoAnalysis.buildingCharacteristics) {
              descParts.push(`【建物】${photoAnalysis.buildingCharacteristics}`);
            }
            if (photoAnalysis.estimatedMaterials && photoAnalysis.estimatedMaterials.length > 0) {
              descParts.push(`【使用材料（推測）】${photoAnalysis.estimatedMaterials.join('、')}`);
            }
            suggestedData.description = descParts.join('\n');
            sources.push({
              field: 'description',
              source: 'photo',
              confidence: photoAnalysis.confidence,
              reason: '写真から施工内容を推測',
            });
          }
        }
      } catch (error) {
        console.error('Photo analysis error:', error);
      }
    }

    // ドキュメントからの情報を取得
    const documentSummaries: string[] = [];
    for (const doc of documents) {
      if (doc.ai_summary) {
        try {
          const summary = JSON.parse(doc.ai_summary);

          // 各フィールドをマージ（ドキュメントの情報を優先）
          if (summary.name && !suggestedData.name) {
            suggestedData.name = summary.name;
            sources.push({
              field: 'name',
              source: 'document',
              confidence: summary.confidence?.name || 0.8,
              reason: `${doc.file_name}から抽出`,
            });
          }
          if (summary.client_name && !suggestedData.client_name) {
            suggestedData.client_name = summary.client_name;
            sources.push({
              field: 'client_name',
              source: 'document',
              confidence: summary.confidence?.client_name || 0.8,
              reason: `${doc.file_name}から抽出`,
            });
          }
          if (summary.address && !suggestedData.address) {
            suggestedData.address = summary.address;
            sources.push({
              field: 'address',
              source: 'document',
              confidence: summary.confidence?.address || 0.8,
              reason: `${doc.file_name}から抽出`,
            });
          }
          if (summary.start_date && !suggestedData.start_date) {
            suggestedData.start_date = summary.start_date;
            sources.push({
              field: 'start_date',
              source: 'document',
              confidence: summary.confidence?.start_date || 0.7,
              reason: `${doc.file_name}から抽出`,
            });
          }
          if (summary.end_date && !suggestedData.end_date) {
            suggestedData.end_date = summary.end_date;
            sources.push({
              field: 'end_date',
              source: 'document',
              confidence: summary.confidence?.end_date || 0.7,
              reason: `${doc.file_name}から抽出`,
            });
          }
          if (summary.status && !suggestedData.status) {
            suggestedData.status = summary.status as ProjectStatus;
            sources.push({
              field: 'status',
              source: 'document',
              confidence: summary.confidence?.status || 0.7,
              reason: `${doc.file_name}から抽出`,
            });
          }

          // ドキュメントのタグをマージ
          if (summary.tags && Array.isArray(summary.tags) && summary.tags.length > 0) {
            const existingTags = new Set(suggestedData.tags);
            summary.tags.forEach((tag: string) => {
              if (!existingTags.has(tag as ProjectTag)) {
                suggestedData.tags.push(tag as ProjectTag);
              }
            });
            // タグのソースを更新
            const existingTagSource = sources.find((s) => s.field === 'tags');
            if (existingTagSource) {
              existingTagSource.reason += `、${doc.file_name}から追加`;
            } else {
              sources.push({
                field: 'tags',
                source: 'document',
                confidence: summary.confidence?.tags || 0.8,
                reason: `${doc.file_name}から抽出`,
              });
            }
          }

          // 要約をリストに追加
          if (summary.description) {
            documentSummaries.push(summary.description);
          }
        } catch {
          // JSONパースエラーは無視
        }
      }
    }

    // HP用説明文を生成
    try {
      const allTags = [...new Set([...currentData.tags, ...suggestedData.tags])];
      const publicDescription = await generatePublicDescription(
        claude,
        photoAnalysis,
        documentSummaries,
        allTags
      );

      if (publicDescription) {
        suggestedData.public_description = publicDescription;
        sources.push({
          field: 'public_description',
          source: 'generated',
          confidence: 0.7,
          reason: '写真とドキュメント情報から自動生成',
        });
      }
    } catch (error) {
      console.error('Public description generation error:', error);
    }

    return NextResponse.json({
      success: true,
      currentData,
      suggestedData,
      sources,
    });
  } catch (error) {
    console.error('Integrate info error:', error);
    return NextResponse.json(
      {
        success: false,
        currentData: {} as ProjectFieldsToIntegrate,
        suggestedData: {} as ProjectFieldsToIntegrate,
        sources: [],
        error: error instanceof Error ? error.message : '情報の統合に失敗しました',
      },
      { status: 500 }
    );
  }
}
