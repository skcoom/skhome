import Anthropic from '@anthropic-ai/sdk';
import type { EnhancedProjectData, GeneratedBlogPost } from '@/types/blog-generation';

// Claude APIクライアントの作成
export function createClaudeClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  return new Anthropic({
    apiKey,
  });
}

// 拡張ブログ記事生成プロンプト（写真・ドキュメント情報を活用）
export function generateEnhancedBlogPrompt(data: EnhancedProjectData): string {
  const tagsText = data.tags.length > 0 ? data.tags.join('、') : '未設定';

  // ドキュメントから抽出した追加情報を整形
  let documentInfo = '';
  if (data.documentSummaries.length > 0) {
    const extractedDetails: string[] = [];
    for (const doc of data.documentSummaries) {
      if (doc.extractedData?.description) {
        extractedDetails.push(doc.extractedData.description);
      }
    }
    if (extractedDetails.length > 0) {
      documentInfo = `\n\n## ドキュメントから抽出した詳細情報\n${extractedDetails.join('\n')}`;
    }
  }

  // 写真情報を整形
  let photoInfoText = '';
  if (data.photoInfo.hasBeforeAfter) {
    photoInfoText = `\n\n## 写真情報
- ビフォー写真: ${data.photoInfo.beforeCount}枚
- 施工中写真: ${data.photoInfo.duringCount}枚
- アフター写真: ${data.photoInfo.afterCount}枚
- ビフォーアフター比較: あり`;

    if (data.photoInfo.featuredPhotos.length > 0) {
      const featuredList = data.photoInfo.featuredPhotos
        .filter((p) => p.caption)
        .map((p) => `  - ${p.phase}: ${p.caption}`)
        .join('\n');
      if (featuredList) {
        photoInfoText += `\n- 注目写真:\n${featuredList}`;
      }
    }
  }

  // 工期情報
  let periodText = '';
  if (data.startDate || data.endDate) {
    const start = data.startDate || '未定';
    const end = data.endDate || '未定';
    periodText = `- 工期: ${start} ～ ${end}`;
  }

  return `あなたは建設会社「株式会社SKコーム」のブログ記事を書くプロのライターです。
以下の施工事例について、読者に興味を持ってもらえる質の高いブログ記事を日本語で書いてください。

## 施工情報（基本）
- 工事名: ${data.name}
- 施工種類: ${tagsText}
${data.clientName ? `- 施主: ${data.clientName}様` : ''}
${data.address ? `- 施工場所: ${data.address}` : ''}
${periodText}
${data.description ? `\n## 管理者メモ\n${data.description}` : ''}
${data.publicDescription ? `\n## HP用概要文（参考）\n${data.publicDescription}` : ''}${documentInfo}${photoInfoText}

## 記事の要件
1. タイトル: 魅力的でSEOに最適化（「〇〇リフォーム事例」等のキーワードを含む）
2. 導入文: 読者の興味を引く問いかけや共感できる課題から始める
3. 施工ポイント: 具体的な工夫や技術的なこだわりを説明
4. ビフォーアフター: 写真情報がある場合、変化を言葉で描写
5. お客様メリット: 施工後の生活がどう変わるかを強調
6. CTA: 「お気軽にご相談ください」等で締める
7. 文字数: 1000〜1500文字程度

## 禁止事項
- 具体的な金額や費用の記載
- 型番や品番の記載
- 施主の個人名をそのまま記載（「お客様」と表記）

## 出力形式
以下のJSON形式で出力してください：
\`\`\`json
{
  "title": "記事タイトル",
  "excerpt": "100文字程度の要約",
  "content": "本文（Markdown形式）"
}
\`\`\``;
}

// ブログ記事生成プロンプト（後方互換性のため維持）
export function generateBlogPrompt(project: {
  name: string;
  category: string;
  description?: string;
  clientName?: string;
  address?: string;
}): string {
  const categoryLabels: Record<string, string> = {
    apartment: 'マンション',
    remodeling: 'リフォーム',
    new_construction: '新築',
    house: '住宅',
  };

  const categoryLabel = categoryLabels[project.category] || project.category;

  return `あなたは建設会社「株式会社SKコーム」のブログ記事を書くライターです。
以下の施工事例について、読者に興味を持ってもらえるブログ記事を日本語で書いてください。

## 施工情報
- 工事名: ${project.name}
- カテゴリ: ${categoryLabel}
${project.clientName ? `- 施主: ${project.clientName}` : ''}
${project.address ? `- 場所: ${project.address}` : ''}
${project.description ? `- 工事概要: ${project.description}` : ''}

## 記事の要件
1. タイトルは魅力的で、検索エンジンに最適化されたものにしてください
2. 導入文で読者の興味を引きつけてください
3. 施工のポイントや工夫した点を具体的に説明してください
4. お客様目線でのメリットを強調してください
5. 最後に「お気軽にご相談ください」等のCTAを入れてください
6. 全体で800〜1200文字程度にしてください

## 出力形式
以下のJSON形式で出力してください：
\`\`\`json
{
  "title": "記事タイトル",
  "excerpt": "100文字程度の要約",
  "content": "本文（Markdown形式）"
}
\`\`\``;
}

// 共通のレスポンスパース処理
function parseBlogResponse(response: Anthropic.Message): GeneratedBlogPost {
  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response');
  }

  const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]) as Record<string, unknown>;
    return {
      title: (parsed.title as string) || '',
      excerpt: (parsed.excerpt as string) || '',
      content: (parsed.content as string) || '',
    };
  } catch {
    throw new Error('Failed to parse generated blog post');
  }
}

// 拡張版ブログ記事生成（写真・ドキュメント情報を活用）
export async function generateEnhancedBlogPost(
  data: EnhancedProjectData
): Promise<GeneratedBlogPost> {
  const client = createClaudeClient();
  const prompt = generateEnhancedBlogPrompt(data);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return parseBlogResponse(response);
}

// Claude APIでブログ記事を生成（後方互換性のため維持）
export async function generateBlogPost(project: {
  name: string;
  category: string;
  description?: string;
  clientName?: string;
  address?: string;
}): Promise<GeneratedBlogPost> {
  const client = createClaudeClient();
  const prompt = generateBlogPrompt(project);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return parseBlogResponse(response);
}
