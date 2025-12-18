import Anthropic from '@anthropic-ai/sdk';

// Claude APIクライアントの作成
export function createClaudeClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  return new Anthropic({
    apiKey,
  });
}

// ブログ記事生成プロンプト
export function generateBlogPrompt(project: {
  name: string;
  category: string;
  description?: string;
  clientName?: string;
  address?: string;
}) {
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

// ブログ記事の型
export interface GeneratedBlogPost {
  title: string;
  excerpt: string;
  content: string;
}

// Claude APIでブログ記事を生成
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

  // レスポンスからテキストを抽出
  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response');
  }

  // JSONを抽出してパース
  const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return {
      title: parsed.title || '',
      excerpt: parsed.excerpt || '',
      content: parsed.content || '',
    };
  } catch (e) {
    throw new Error('Failed to parse generated blog post');
  }
}
