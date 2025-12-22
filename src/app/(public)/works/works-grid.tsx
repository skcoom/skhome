'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { WorkItem } from './page';
import { Pagination } from '@/components/ui/pagination';

const WORKS_PER_PAGE = 9;

interface WorksGridProps {
  works: WorkItem[];
  categoryLabels: Record<string, string>;
}

export function WorksGrid({ works, categoryLabels }: WorksGridProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredWorks = useMemo(() => {
    return activeCategory === 'all'
      ? works
      : works.filter((work) => work.category === activeCategory);
  }, [works, activeCategory]);

  const totalPages = Math.ceil(filteredWorks.length / WORKS_PER_PAGE);

  const paginatedWorks = useMemo(() => {
    const startIndex = (currentPage - 1) * WORKS_PER_PAGE;
    return filteredWorks.slice(startIndex, startIndex + WORKS_PER_PAGE);
  }, [filteredWorks, currentPage]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Category filter */}
      <section className="py-8 bg-[#F0EFE9]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleCategoryChange(key)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === key
                    ? 'bg-[#26A69A] text-white'
                    : 'bg-[#FAF9F6] text-[#666666] hover:bg-[#E5E4E0]'
                }`}
              >
                {label}
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
              {filteredWorks.map((work) => (
                <Link
                  key={work.id}
                  href={`/works/${work.id}`}
                  className="group"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-[#E5E4E0] rounded-lg overflow-hidden mb-4">
                    {work.thumbnailUrl ? (
                      <img
                        src={work.thumbnailUrl}
                        alt={work.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999999] text-sm">
                        準備中
                      </div>
                    )}
                    {/* Category badge */}
                    <div className="absolute top-4 left-4">
                      <span className="inline-block bg-[#26A69A] text-white text-xs font-medium px-3 py-1 rounded-full">
                        {categoryLabels[work.category] || work.category}
                      </span>
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
                {activeCategory === 'all'
                  ? '施工実績がありません'
                  : `${categoryLabels[activeCategory]}の施工実績がありません`}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
