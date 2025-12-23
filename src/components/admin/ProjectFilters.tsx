'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface ProjectFiltersProps {
  currentStatus?: string;
  currentCategory?: string;
}

export function ProjectFilters({ currentStatus, currentCategory }: ProjectFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleStatusChange = (value: string) => {
    const queryString = createQueryString('status', value);
    router.push(`/projects${queryString ? `?${queryString}` : ''}`);
  };

  const handleCategoryChange = (value: string) => {
    const queryString = createQueryString('category', value);
    router.push(`/projects${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={currentStatus || ''}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">すべてのステータス</option>
        <option value="planning">計画中</option>
        <option value="in_progress">施工中</option>
        <option value="completed">完了</option>
      </select>
      <select
        value={currentCategory || ''}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">すべてのカテゴリ</option>
        <option value="apartment">マンション</option>
        <option value="remodeling">リフォーム</option>
        <option value="new_construction">新築</option>
        <option value="house">住宅</option>
      </select>
    </div>
  );
}
