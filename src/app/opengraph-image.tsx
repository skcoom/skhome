import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'SKコーム - リフォーム・建築';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF9F6',
          backgroundImage: 'linear-gradient(135deg, #FAF9F6 0%, #F0EFE9 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 40,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                backgroundColor: '#26A69A',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 24,
              }}
            >
              <span style={{ fontSize: 40, color: 'white', fontWeight: 700 }}>SK</span>
            </div>
            <span style={{ fontSize: 64, fontWeight: 700, color: '#333333' }}>
              SKコーム
            </span>
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#666666',
              textAlign: 'center',
              maxWidth: 800,
              lineHeight: 1.5,
            }}
          >
            暮らしの「つづき」をつくる、信頼のリフォーム会社
          </div>
          <div
            style={{
              marginTop: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#E0F2F1',
                padding: '12px 24px',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 20, color: '#26A69A' }}>
                埼玉県さいたま市
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#26A69A',
                padding: '12px 24px',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 20, color: 'white' }}>
                048-711-1359
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
