'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Phone, Mail, MapPin, Menu, X } from 'lucide-react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FAF9F6]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="SKコーム"
                width={160}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-10">
              {[
                { href: '/', label: 'ホーム' },
                { href: '/company', label: '会社概要' },
                { href: '/works', label: '施工実績' },
                { href: '/blog', label: 'ブログ' },
                { href: '/contact', label: 'お問い合わせ' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative text-[#333333] text-sm tracking-wide hover:text-[#26A69A] transition-colors group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#26A69A] transition-all group-hover:w-full" />
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden md:flex items-center space-x-6">
              <a
                href="tel:048-XXX-XXXX"
                className="text-sm text-[#666666] hover:text-[#26A69A] transition-colors"
              >
                Tel. 048-XXX-XXXX
              </a>
              <Link
                href="/contact"
                className="accent-badge text-sm hover:bg-[#009688] transition-colors"
              >
                無料相談
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-[#333333]"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#FAF9F6] border-t border-[#E5E4E0]">
            <nav className="px-6 py-4 space-y-4">
              {[
                { href: '/', label: 'ホーム' },
                { href: '/company', label: '会社概要' },
                { href: '/works', label: '施工実績' },
                { href: '/blog', label: 'ブログ' },
                { href: '/contact', label: 'お問い合わせ' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-[#333333] text-sm tracking-wide py-2"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-[#E5E4E0]">
                <a
                  href="tel:048-XXX-XXXX"
                  className="block text-sm text-[#666666] py-2"
                >
                  Tel. 048-XXX-XXXX
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
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
                  埼玉県川口市八幡木3-7-1
                </p>
                <p className="flex items-center">
                  <Phone className="h-4 w-4 mr-3 text-[#4DB6AC]" />
                  048-XXX-XXXX
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
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium tracking-wider mb-6 text-[#4DB6AC]">メニュー</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { href: '/', label: 'ホーム' },
                  { href: '/company', label: '会社概要' },
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

          <div className="border-t border-[#444444] mt-12 pt-8 text-center">
            <p className="text-[#666666] text-xs tracking-wider">
              &copy; {new Date().getFullYear()} 株式会社SKコーム All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
