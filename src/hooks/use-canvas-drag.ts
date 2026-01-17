'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ImageTransform } from '@/types/database';

interface UseCanvasDragOptions {
  initialTransform?: ImageTransform;
  onTransformChange?: (transform: ImageTransform) => void;
  minScale?: number;
  maxScale?: number;
}

interface UseCanvasDragReturn {
  transform: ImageTransform;
  isDragging: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  setScale: (scale: number) => void;
  setOffset: (offsetX: number, offsetY: number) => void;
  reset: () => void;
}

const defaultTransform: ImageTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

export function useCanvasDrag({
  initialTransform = defaultTransform,
  onTransformChange,
  minScale = 0.5,
  maxScale = 2,
}: UseCanvasDragOptions = {}): UseCanvasDragReturn {
  const [transform, setTransform] = useState<ImageTransform>(initialTransform);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startOffsetRef = useRef({ x: 0, y: 0 });

  const updateTransform = useCallback(
    (newTransform: ImageTransform) => {
      setTransform(newTransform);
      onTransformChange?.(newTransform);
    },
    [onTransformChange]
  );

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      startPosRef.current = { x: clientX, y: clientY };
      startOffsetRef.current = { x: transform.offsetX, y: transform.offsetY };
    },
    [transform.offsetX, transform.offsetY]
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;

      const deltaX = clientX - startPosRef.current.x;
      const deltaY = clientY - startPosRef.current.y;

      updateTransform({
        ...transform,
        offsetX: startOffsetRef.current.x + deltaX,
        offsetY: startOffsetRef.current.y + deltaY,
      });
    },
    [isDragging, transform, updateTransform]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [handleDragStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const setScale = useCallback(
    (scale: number) => {
      const clampedScale = Math.max(minScale, Math.min(maxScale, scale));
      updateTransform({ ...transform, scale: clampedScale });
    },
    [transform, updateTransform, minScale, maxScale]
  );

  const setOffset = useCallback(
    (offsetX: number, offsetY: number) => {
      updateTransform({ ...transform, offsetX, offsetY });
    },
    [transform, updateTransform]
  );

  const reset = useCallback(() => {
    updateTransform(defaultTransform);
  }, [updateTransform]);

  return {
    transform,
    isDragging,
    containerRef,
    handleMouseDown,
    handleTouchStart,
    setScale,
    setOffset,
    reset,
  };
}
