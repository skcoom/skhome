'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MarkdownContent } from '@/components/ui/markdown-content';

interface DescriptionSectionProps {
  content: string;
  initialLines?: number;
}

export function DescriptionSection({ content, initialLines = 3 }: DescriptionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // コンテンツが短い場合は折りたたみ不要
  const lines = content.split('\n');
  const isLongContent = lines.length > initialLines || content.length > 200;

  if (!isLongContent) {
    return (
      <div className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm tracking-widest text-[#26A69A] mb-4">ABOUT</p>
            <h2 className="text-xl lg:text-2xl font-medium text-[#333333] mb-6">
              工事概要
            </h2>
            <MarkdownContent content={content} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm tracking-widest text-[#26A69A] mb-4">ABOUT</p>
          <h2 className="text-xl lg:text-2xl font-medium text-[#333333] mb-6">
            工事概要
          </h2>

          <div
            className={`relative overflow-hidden transition-all duration-300 ${
              isExpanded ? 'max-h-none' : 'max-h-32'
            }`}
          >
            <MarkdownContent content={content} />

            {/* グラデーションオーバーレイ（折りたたみ時） */}
            {!isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#FAF9F6] to-transparent" />
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 inline-flex items-center text-[#26A69A] hover:text-[#009688] transition-colors text-sm font-medium"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" />
                閉じる
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" />
                続きを読む
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
