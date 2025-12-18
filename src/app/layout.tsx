import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SKコーム | リフォーム・建築",
  description: "お客様の暮らしの「つづき」をつくる、信頼のリフォーム会社です。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
