const CONTACT_TYPE_LABELS: Record<string, string> = {
  estimate: '見積もりのご依頼',
  consultation: 'リフォームのご相談',
  inspection: '現地確認のご依頼',
  other: 'その他のお問い合わせ',
};

export function formatContactMessage(type: string, message: string): string {
  if (!type) return message;

  const label = CONTACT_TYPE_LABELS[type] || type;
  return `【${label}】\n${message}`;
}

export function localizeStoredContactMessage(message: string): string {
  return message.replace(/^【([^】]+)】/, (matched, type: string) => {
    const label = CONTACT_TYPE_LABELS[type];
    return label ? `【${label}】` : matched;
  });
}
