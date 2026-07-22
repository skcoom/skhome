'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Share failed:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="flex items-center hover:text-[#26A69A] transition-colors"
      aria-label="この記事を共有"
    >
      <Share2 className="mr-1.5 h-4 w-4" />
      {copied ? 'URLをコピーしました' : 'シェア'}
    </button>
  );
}
