'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { ProjectStatus } from '@/types/database';

interface StatusChangerProps {
  projectId: string;
  currentStatus: ProjectStatus;
}

const statusConfig: Record<
  ProjectStatus,
  { label: string; color: string; bgColor: string }
> = {
  planning: {
    label: '計画中',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100 hover:bg-yellow-200',
  },
  in_progress: {
    label: '施工中',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100 hover:bg-blue-200',
  },
  completed: {
    label: '完了',
    color: 'text-green-800',
    bgColor: 'bg-green-100 hover:bg-green-200',
  },
};

const statusOrder: ProjectStatus[] = ['planning', 'in_progress', 'completed'];

export function StatusChanger({ projectId, currentStatus }: StatusChangerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusChange = async (
    e: React.MouseEvent,
    newStatus: ProjectStatus
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました');
      }

      router.refresh();
    } catch (error) {
      console.error('Status update error:', error);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUpdating) {
      setIsOpen(!isOpen);
    }
  };

  const config = statusConfig[currentStatus];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={isUpdating}
        className={`flex items-center space-x-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${config.bgColor} ${config.color}`}
      >
        {isUpdating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <span>{config.label}</span>
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            {statusOrder.map((status) => {
              const statusConf = statusConfig[status];
              const isSelected = status === currentStatus;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={(e) => handleStatusChange(e, status)}
                  className={`flex w-full items-center px-3 py-2 text-sm ${
                    isSelected
                      ? 'bg-gray-100 font-medium'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`mr-2 h-2 w-2 rounded-full ${statusConf.bgColor}`}
                  />
                  <span className={statusConf.color}>{statusConf.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
