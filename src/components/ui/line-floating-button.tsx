'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const LINE_URL = 'https://lin.ee/JDHT8YK';

export function LineFloatingButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // ページ読み込み後にアニメーション表示
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    // 初回訪問時はツールチップを表示
    const hasVisited = localStorage.getItem('line-tooltip-shown');
    if (!hasVisited) {
      const tooltipTimer = setTimeout(() => {
        setShowTooltip(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
        clearTimeout(tooltipTimer);
      };
    }

    return () => clearTimeout(timer);
  }, []);

  const handleCloseTooltip = () => {
    setShowTooltip(false);
    localStorage.setItem('line-tooltip-shown', 'true');
  };

  const handleClick = () => {
    handleCloseTooltip();
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}
    >
      {/* ツールチップ */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-3 animate-bounce">
          <div className="relative bg-white rounded-lg shadow-lg p-3 pr-8 min-w-[180px]">
            <button
              onClick={handleCloseTooltip}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-sm text-gray-700 font-medium">
              LINEでお気軽に
              <br />
              ご相談ください
            </p>
            {/* 吹き出しの矢印 */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white transform rotate-45 shadow-lg" />
          </div>
        </div>
      )}

      {/* LINEボタン */}
      <a
        href={LINE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex items-center justify-center w-16 h-16 bg-[#06C755] rounded-full shadow-lg hover:bg-[#05b04c] hover:scale-110 transition-all duration-300 group"
        aria-label="LINEで問い合わせ"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-9 h-9 fill-white"
        >
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      </a>
    </div>
  );
}
