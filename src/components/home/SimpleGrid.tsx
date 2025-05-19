import React from 'react';

export const SimpleGrid: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)" // Softer grid lines for dark theme
              strokeWidth="0.5" // Thinner grid lines
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
};