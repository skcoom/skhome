import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#333333] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Company info */}
          <div className="md:col-span-5">
            <div className="mb-6">
              <Image
                src="/logo.png"
                alt="SKコーム"
                width={140}
                height={35}
                className="h-9 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-[#999999] text-sm leading-relaxed mb-6">
              お客様の夢のお家づくりを、私たちと一緒に。<br />
              つくり手が直接ご要望を伺う、信頼のリフォーム会社です。
            </p>
            <div className="space-y-3 text-[#999999] text-sm">
              <p className="flex items-center">
                <MapPin className="h-4 w-4 mr-3 text-[#4DB6AC]" />
                埼玉県さいたま市緑区東浦和8-2-12
              </p>
              <p className="flex items-center">
                <Phone className="h-4 w-4 mr-3 text-[#4DB6AC]" />
                048-711-1359
              </p>
              <p className="flex items-center">
                <Mail className="h-4 w-4 mr-3 text-[#4DB6AC]" />
                info@skcoom.co.jp
              </p>
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden md:block md:col-span-2" />

          {/* Quick links */}
          <nav className="md:col-span-2" aria-label="フッターメニュー">
            <h4 className="text-sm font-medium tracking-wider mb-6 text-[#4DB6AC]">メニュー</h4>
            <ul className="space-y-3 text-sm">
              {[
                { href: '/', label: 'ホーム' },
                { href: '/company', label: '会社概要' },
                { href: '/members', label: 'メンバー' },
                { href: '/works', label: '施工実績' },
                { href: '/blog', label: 'ブログ' },
                { href: '/contact', label: 'お問い合わせ' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[#999999] hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="md:col-span-3">
            <h4 className="text-sm font-medium tracking-wider mb-6 text-[#4DB6AC]">サービス</h4>
            <ul className="space-y-3 text-sm">
              {[
                { href: '/works?category=remodeling', label: 'リフォーム' },
                { href: '/works?category=apartment', label: 'マンション工事' },
                { href: '/works?category=new_construction', label: '新築工事' },
                { href: '/works?category=house', label: '住宅工事' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[#999999] hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[#444444] mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[#666666] text-xs tracking-wider">
            &copy; {new Date().getFullYear()} 株式会社SKコーム All rights reserved.
          </p>
          <Link
            href="/privacy"
            className="text-[#666666] text-xs hover:text-white transition-colors"
          >
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </footer>
  );
}
