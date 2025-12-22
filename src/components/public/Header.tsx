'use client';

// Header component with navigation menu
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
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
          <nav className="hidden md:flex items-center space-x-10" aria-label="メインナビゲーション">
            {[
              { href: '/', label: 'ホーム' },
              { href: '/company', label: '会社概要' },
              { href: '/members', label: 'メンバー' },
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
              href="tel:048-711-1359"
              className="text-sm text-[#666666] hover:text-[#26A69A] transition-colors"
            >
              Tel. 048-711-1359
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
            aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div id="mobile-navigation" className="md:hidden bg-[#FAF9F6] border-t border-[#E5E4E0]">
          <nav className="px-6 py-4 space-y-4" aria-label="モバイルナビゲーション">
            {[
              { href: '/', label: 'ホーム' },
              { href: '/company', label: '会社概要' },
              { href: '/members', label: 'メンバー' },
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
                href="tel:048-711-1359"
                className="block text-sm text-[#666666] py-2"
              >
                Tel. 048-711-1359
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
