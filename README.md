This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## SKコーム固有の構成

- `/`: `public/_approved-home-source.html` の合意済みデザインをNext.js上で表示
- `/admin/dashboard`: 現場優先のダッシュボード
- `/admin/genba`: LINE写真・AI判定の確認、現場・工程の訂正、公開候補の選定
- `workers/genba-ai`: LINE原本を非公開R2から権限付きで配信するWorker

管理画面では、LINE写真を「社内のみ」から「公開候補」へ選んだ後、別の最終確認で公開用コピーを作成します。掲載停止時は公開用コピーを削除して社内のみに戻します。R2原本を公開バケットへ移動したり、内部写真を自動公開したりしません。

既存のSupabase環境変数に加えて、必要な場合だけWorker URLを上書きできます。値を設定しない場合は本番Worker URLを使います。

```bash
GENBA_AI_BASE_URL='https://<genba-ai-worker-domain>'
```

ローカル検証:

```bash
npm ci
npm test
npm run lint
npm run build

cd workers/genba-ai
npm ci
npm run typecheck
npm test
npm run test:migration
npx wrangler deploy --dry-run
```
