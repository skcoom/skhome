import {
  contactFormSchema,
  sanitizeInput,
  formatZodErrors,
} from '@/lib/validations';

describe('contactFormSchema', () => {
  describe('正常なデータ', () => {
    it('全フィールドが有効な場合、パースが成功する', () => {
      const validData = {
        name: '山田太郎',
        email: 'yamada@example.com',
        phone: '090-1234-5678',
        message: 'お問い合わせ内容です。',
      };

      const result = contactFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('電話番号なしでもパースが成功する', () => {
      const validData = {
        name: '山田太郎',
        email: 'yamada@example.com',
        message: 'お問い合わせ内容です。',
      };

      const result = contactFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('ハイフンなし電話番号でもパースが成功する', () => {
      const validData = {
        name: '山田太郎',
        email: 'yamada@example.com',
        phone: '09012345678',
        message: 'お問い合わせ内容です。',
      };

      const result = contactFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('バリデーションエラー', () => {
    it('名前が空の場合、エラーになる', () => {
      const invalidData = {
        name: '',
        email: 'yamada@example.com',
        message: 'お問い合わせ内容です。',
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('メールアドレスが無効な場合、エラーになる', () => {
      const invalidData = {
        name: '山田太郎',
        email: 'invalid-email',
        message: 'お問い合わせ内容です。',
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('メッセージが空の場合、エラーになる', () => {
      const invalidData = {
        name: '山田太郎',
        email: 'yamada@example.com',
        message: '',
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('電話番号が無効な形式の場合、エラーになる', () => {
      const invalidData = {
        name: '山田太郎',
        email: 'yamada@example.com',
        phone: 'abc-defg-hijk',
        message: 'お問い合わせ内容です。',
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe('sanitizeInput', () => {
  it('HTMLタグをエスケープする', () => {
    const input = '<script>alert("XSS")</script>';
    const result = sanitizeInput(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
  });

  it('通常のテキストは変更しない', () => {
    const input = '普通のテキストです';
    const result = sanitizeInput(input);
    expect(result).toBe(input);
  });

  it('&記号をエスケープする', () => {
    const input = 'A & B';
    const result = sanitizeInput(input);
    expect(result).toContain('&amp;');
  });
});

describe('formatZodErrors', () => {
  it('Zodエラーから日本語メッセージ配列を返す', () => {
    const invalidData = {
      name: '',
      email: 'invalid',
      message: '',
    };

    const result = contactFormSchema.safeParse(invalidData);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
    }
  });
});
