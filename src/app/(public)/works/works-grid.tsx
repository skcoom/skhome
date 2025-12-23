'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { WorkItem } from './page';
import { Pagination } from '@/components/ui/pagination';

const WORKS_PER_PAGE = 9;

interface WorksGridProps {
  works: WorkItem[];
  tags: readonly string[];
}

export function WorksGrid({ works, tags }: WorksGridProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredWorks = useMemo(() => {
    return activeTag === null
      ? works
      : works.filter((work) => work.tags.includes(activeTag));
  }, [works, activeTag]);

  const totalPages = Math.ceil(filteredWorks.length / WORKS_PER_PAGE);

  const paginatedWorks = useMemo(() => {
    const startIndex = (currentPage - 1) * WORKS_PER_PAGE;
    return filteredWorks.slice(startIndex, startIndex + WORKS_PER_PAGE);
  }, [filteredWorks, currentPage]);

  const handleTagChange = (tag: string | null) => {
    setActiveTag(tag);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Tag filter */}
      <section className="py-8 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => handleTagChange(null)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
                activeTag === null
                  ? 'bg-[#26A69A] text-white'
                  : 'bg-[#FAF9F6] text-[#666666] hover:bg-[#E5E4E0]'
              }`}
            >
              すべて
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagChange(tag)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  activeTag === tag
                    ? 'bg-[#26A69A] text-white'
                    : 'bg-[#FAF9F6] text-[#666666] hover:bg-[#E5E4E0]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Works grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {filteredWorks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedWorks.map((work) => (
                <Link
                  key={work.id}
                  href={`/works/${work.id}`}
                  className="group"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden mb-4">
                    {work.thumbnailUrl ? (
                      <Image
                        src={work.thumbnailUrl}
                        alt={work.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                        準備中
                      </div>
                    )}
                    {/* Tags badges */}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-1">
                      {work.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-block bg-[#26A69A] text-white text-xs font-medium px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {work.tags.length > 2 && (
                        <span className="inline-block bg-[#26A69A]/80 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                          +{work.tags.length - 2}
                        </span>
                      )}
                    </div>
                    {/* Year badge */}
                    <div className="absolute top-4 right-4">
                      <span className="inline-block bg-white/90 text-[#666666] text-xs font-medium px-2 py-1 rounded">
                        {work.year}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    {work.address && (
                      <p className="text-xs text-[#999999]">{work.address}</p>
                    )}
                    <h2 className="text-lg font-medium text-[#333333] group-hover:text-[#26A69A] transition-colors">
                      {work.name}
                    </h2>
                    {work.description && (
                      <p className="text-sm text-[#666666] line-clamp-2">
                        {work.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-[#999999]">
                {activeTag === null
                  ? '施工実績がありません'
                  : `「${activeTag}」の施工実績がありません`}
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
