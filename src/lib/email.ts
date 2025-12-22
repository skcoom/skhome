import { Resend } from 'resend';

type ContactNotificationData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
};

export async function sendContactNotification(data: ContactNotificationData) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Skipping email notification.');
    return { success: false, error: 'Email service not configured' };
  }

  const resend = new Resend(apiKey);
  const adminEmail = process.env.ADMIN_EMAIL || 'info@skcoom.co.jp';
  const fromEmail = process.env.FROM_EMAIL || 'noreply@skcoom.co.jp';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

  try {
    const { error } = await resend.emails.send({
      from: `SKコーム <${fromEmail}>`,
      to: [adminEmail],
      subject: `【お問い合わせ】${data.name}様より`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px;">
            新しいお問い合わせがありました
          </h2>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 120px;">
                お名前
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                ${escapeHtml(data.name)}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">
                メール
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">
                電話番号
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                ${data.phone ? escapeHtml(data.phone) : '未入力'}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; vertical-align: top;">
                お問い合わせ内容
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; white-space: pre-wrap;">
                ${escapeHtml(data.message)}
              </td>
            </tr>
          </table>

          <div style="margin-top: 30px; text-align: center;">
            <a href="${siteUrl}/contacts"
               style="display: inline-block; background-color: #1a56db; color: white;
                      padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              管理画面で確認する
            </a>
          </div>

          <p style="margin-top: 30px; color: #6b7280; font-size: 12px; text-align: center;">
            このメールはSKコームのWebサイトから自動送信されています。
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
