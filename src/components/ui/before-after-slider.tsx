'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import type { AlignmentSettings, ImageTransform } from '@/types/database';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  aspectRatio?: string;
  className?: string;
  alignmentSettings?: AlignmentSettings | null;
}

const getImageStyle = (transform?: ImageTransform): React.CSSProperties => {
  if (!transform) return {};
  return {
    transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
    transformOrigin: 'center center',
  };
};

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = '施工前',
  afterLabel = '施工後',
  aspectRatio = '4/3',
  className = '',
  alignmentSettings,
}: BeforeAfterSliderProps): React.ReactElement {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveAspectRatio = alignmentSettings?.viewport.aspectRatio || aspectRatio;
  const beforeTransform = alignmentSettings?.before;
  const afterTransform = alignmentSettings?.after;

  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateSliderPosition(e.clientX);
  }, [updateSliderPosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    updateSliderPosition(e.touches[0].clientX);
  }, [updateSliderPosition]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateSliderPosition(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        updateSliderPosition(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, updateSliderPosition]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 5;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + step));
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none ${className}`}
      style={{ aspectRatio: effectiveAspectRatio }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="slider"
      aria-label="ビフォーアフター比較スライダー"
      aria-valuenow={Math.round(sliderPosition)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0">
        <Image
          src={afterImage}
          alt={afterLabel}
          fill
          className="object-cover"
          style={getImageStyle(afterTransform)}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <div className="relative w-full h-full" style={{ width: `${100 / (sliderPosition / 100)}%` }}>
          <Image
            src={beforeImage}
            alt={beforeLabel}
            fill
            className="object-cover"
            style={getImageStyle(beforeTransform)}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>

      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 17l-5-5 5-5m2 10l5-5-5-5"
            />
          </svg>
        </div>
      </div>

      <div className="absolute top-3 left-3 bg-black/60 text-white text-sm px-3 py-1 rounded">
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 bg-black/60 text-white text-sm px-3 py-1 rounded">
        {afterLabel}
      </div>
    </div>
  );
}
