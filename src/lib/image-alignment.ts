import type { ImageTransform } from '@/types/database';

interface ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export async function loadImageData(imageUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const maxSize = 400;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      resolve({
        data: imageData.data,
        width: canvas.width,
        height: canvas.height,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

function toGrayscale(imageData: ImageData): number[] {
  const { data, width, height } = imageData;
  const gray = new Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return gray;
}

function sobelEdgeDetection(gray: number[], width: number, height: number): number[] {
  const edges = new Array(width * height).fill(0);

  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kidx = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[kidx];
          gy += gray[idx] * sobelY[kidx];
        }
      }

      edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return edges;
}

function normalizedCrossCorrelation(
  template: number[],
  image: number[],
  templateWidth: number,
  templateHeight: number,
  imageWidth: number,
  imageHeight: number,
  searchRange: number
): { offsetX: number; offsetY: number; score: number } {
  let bestScore = -Infinity;
  let bestOffsetX = 0;
  let bestOffsetY = 0;

  const centerX = Math.floor(imageWidth / 2);
  const centerY = Math.floor(imageHeight / 2);
  const templateCenterX = Math.floor(templateWidth / 2);
  const templateCenterY = Math.floor(templateHeight / 2);

  for (let dy = -searchRange; dy <= searchRange; dy += 2) {
    for (let dx = -searchRange; dx <= searchRange; dx += 2) {
      let sum = 0;
      let sumTemplate = 0;
      let sumImage = 0;
      let count = 0;

      for (let ty = 0; ty < templateHeight; ty += 2) {
        for (let tx = 0; tx < templateWidth; tx += 2) {
          const ix = tx - templateCenterX + centerX + dx;
          const iy = ty - templateCenterY + centerY + dy;

          if (ix >= 0 && ix < imageWidth && iy >= 0 && iy < imageHeight) {
            const tv = template[ty * templateWidth + tx];
            const iv = image[iy * imageWidth + ix];
            sum += tv * iv;
            sumTemplate += tv * tv;
            sumImage += iv * iv;
            count++;
          }
        }
      }

      if (count > 0 && sumTemplate > 0 && sumImage > 0) {
        const score = sum / Math.sqrt(sumTemplate * sumImage);
        if (score > bestScore) {
          bestScore = score;
          bestOffsetX = dx;
          bestOffsetY = dy;
        }
      }
    }
  }

  return { offsetX: bestOffsetX, offsetY: bestOffsetY, score: bestScore };
}

export async function calculateAlignment(
  beforeImageUrl: string,
  afterImageUrl: string
): Promise<{ before: ImageTransform; after: ImageTransform }> {
  try {
    const [beforeData, afterData] = await Promise.all([
      loadImageData(beforeImageUrl),
      loadImageData(afterImageUrl),
    ]);

    const beforeGray = toGrayscale(beforeData);
    const afterGray = toGrayscale(afterData);

    const beforeEdges = sobelEdgeDetection(beforeGray, beforeData.width, beforeData.height);
    const afterEdges = sobelEdgeDetection(afterGray, afterData.width, afterData.height);

    const searchRange = 50;
    const result = normalizedCrossCorrelation(
      beforeEdges,
      afterEdges,
      beforeData.width,
      beforeData.height,
      afterData.width,
      afterData.height,
      searchRange
    );

    const scaleFactorX = beforeData.width / afterData.width;
    const scaleFactorY = beforeData.height / afterData.height;
    const scaleFactor = Math.min(scaleFactorX, scaleFactorY);

    return {
      before: {
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      after: {
        offsetX: -result.offsetX,
        offsetY: -result.offsetY,
        scale: scaleFactor !== 1 ? scaleFactor : 1,
      },
    };
  } catch (error) {
    console.error('Auto alignment failed:', error);
    return {
      before: { offsetX: 0, offsetY: 0, scale: 1 },
      after: { offsetX: 0, offsetY: 0, scale: 1 },
    };
  }
}
