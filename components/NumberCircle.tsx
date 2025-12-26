
import React from 'react';
import { COLORS } from '../constants';

interface NumberCircleProps {
  n: number | string;
  size?: 'md' | 'lg';
  active?: boolean;
}

export const NumberCircle: React.FC<NumberCircleProps> = ({ n, size = 'md', active = true }) => {
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-lg';
  
  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-full font-bold transition-all duration-300`}
      style={{
        border: `2px solid ${active ? COLORS.mintStroke : '#E5E7EB'}`,
        background: active ? "rgba(127,230,195,0.15)" : "#F9FAFB",
        color: active ? COLORS.midnight : "#9CA3AF",
        boxShadow: active ? "0 8px 20px rgba(6,58,48,0.08)" : "none",
      }}
    >
      {n}
    </div>
  );
};
