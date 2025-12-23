'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-gray max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h2 className="text-xl font-medium text-[#333333] mt-6 mb-3 first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="text-lg font-medium text-[#333333] mt-5 mb-2">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-base font-medium text-[#333333] mt-4 mb-2">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-[#666666] leading-relaxed mb-3">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-4 text-[#666666]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-4 text-[#666666]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[#666666]">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-medium text-[#333333]">
              {children}
            </strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
