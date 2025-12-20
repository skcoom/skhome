import { z } from 'zod';

// 日本の電話番号パターン（ハイフンあり・なし両対応）
const phoneRegex = /^(\d{2,4}-?\d{2,4}-?\d{3,4}|0\d{9,10})$/;

// お問い合わせフォームのスキーマ
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, 'お名前は必須です')
    .max(100, 'お名前は100文字以内で入力してください')
    .refine((val) => val.trim().length > 0, 'お名前を入力してください'),
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください')
    .max(254, 'メールアドレスが長すぎます'),
  phone: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || phoneRegex.test(val.replace(/[\s\u3000]/g, '')),
      '有効な電話番号を入力してください'
    ),
  message: z
    .string()
    .min(1, 'お問い合わせ内容は必須です')
    .max(5000, 'お問い合わせ内容は5000文字以内で入力してください')
    .refine((val) => val.trim().length > 0, 'お問い合わせ内容を入力してください'),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

// ブログ記事のスキーマ
export const blogPostSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(200, 'タイトルは200文字以内で入力してください'),
  slug: z
    .string()
    .min(1, 'スラッグは必須です')
    .max(100, 'スラッグは100文字以内で入力してください')
    .regex(/^[a-z0-9-]+$/, 'スラッグは小文字英数字とハイフンのみ使用できます'),
  content: z
    .string()
    .min(1, '本文は必須です')
    .max(100000, '本文が長すぎます'),
  excerpt: z
    .string()
    .max(500, '抜粋は500文字以内で入力してください')
    .optional()
    .nullable(),
  category: z.enum(['news', 'column', 'case_study'], {
    message: '有効なカテゴリを選択してください',
  }),
  status: z.enum(['draft', 'published'], {
    message: '有効なステータスを選択してください',
  }),
  featured_image: z
    .string()
    .url('有効なURLを入力してください')
    .optional()
    .nullable(),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;

// プロジェクト（施工実績）のスキーマ
export const projectSchema = z.object({
  name: z
    .string()
    .min(1, 'プロジェクト名は必須です')
    .max(200, 'プロジェクト名は200文字以内で入力してください'),
  category: z.enum(['remodeling', 'apartment', 'new_construction', 'house'], {
    message: '有効なカテゴリを選択してください',
  }),
  description: z
    .string()
    .max(5000, '説明は5000文字以内で入力してください')
    .optional()
    .nullable(),
  address: z
    .string()
    .max(500, '住所は500文字以内で入力してください')
    .optional()
    .nullable(),
  is_public: z.boolean().default(false),
});

export type ProjectInput = z.infer<typeof projectSchema>;

// バリデーションエラーをフォーマット
export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.message);
}

// XSS対策: HTMLタグをエスケープ
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
