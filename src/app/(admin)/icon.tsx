import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        width="32"
        height="32"
        viewBox="0 0 120 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* S letter */}
        <path
          d="M10 35 L35 10 L60 35 L35 60 Z"
          fill="#6366f1"
          stroke="#4f46e5"
          strokeWidth="2"
        />
        <path
          d="M35 60 L60 35 L85 60 L60 85 Z"
          fill="#818cf8"
          stroke="#6366f1"
          strokeWidth="2"
        />

        {/* K letter */}
        <text
          x="70"
          y="45"
          fontSize="48"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
          fill="#4f46e5"
        >
          K
        </text>

        {/* Bottom diamond shape */}
        <path
          d="M25 85 L60 50 L95 85 L60 120 Z"
          fill="none"
          stroke="#6366f1"
          strokeWidth="4"
        />
        <path
          d="M35 85 L60 60 L85 85 L60 110 Z"
          fill="none"
          stroke="#818cf8"
          strokeWidth="3"
        />
      </svg>
    ),
    {
      ...size,
    }
  );
}
