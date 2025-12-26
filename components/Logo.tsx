
import React from 'react';

export const Logo: React.FC<{ size?: number }> = ({ size = 52 }) => {
  // Pointy-top hexagon helper
  const hexPoints = (cx: number, cy: number, r: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(" ");
  };

  // Positions to match the image layout
  const hexes = [
    { cx: 60, cy: 32 }, // Top
    { cx: 34, cy: 60 }, // Left
    { cx: 86, cy: 60 }, // Right
    { cx: 60, cy: 88 }, // Bottom
  ];

  const outerRadius = 24.5;
  const innerRadius = 18.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OnChain Jackpot Logo"
    >
      <defs>
        {/* Rich gold gradient matching the image */}
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7e1a0" />
          <stop offset="30%" stopColor="#d4af37" />
          <stop offset="70%" stopColor="#b8860b" />
          <stop offset="100%" stopColor="#8b6508" />
        </linearGradient>
        
        {/* Subtle inner shadow for the gold parts */}
        <filter id="innerBevel" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.5" in="SourceAlpha" result="blur" />
          <feOffset dx="0.5" dy="0.5" in="blur" result="offsetBlur" />
          <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
        </filter>

        {/* Outer green shadow/depth */}
        <filter id="greenDepth" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Main Green Frame (Single continuous look) */}
      <g fill="#0b533a" filter="url(#greenDepth)">
        {hexes.map((h, i) => (
          <polygon key={`outer-${i}`} points={hexPoints(h.cx, h.cy, outerRadius)} />
        ))}
      </g>

      {/* Inner Golden Hexagons */}
      <g filter="url(#innerBevel)">
        {hexes.map((h, i) => (
          <React.Fragment key={`inner-gold-${i}`}>
            {/* Darker border for the gold */}
            <polygon
              points={hexPoints(h.cx, h.cy, innerRadius + 1)}
              fill="#5c4a1e"
            />
            {/* Main Gold Fill */}
            <polygon
              points={hexPoints(h.cx, h.cy, innerRadius)}
              fill="url(#goldGrad)"
            />
            {/* Shiny highlight on the top left of each gold hex */}
            <path
              d={`M ${h.cx - 8} ${h.cy - 12} L ${h.cx} ${h.cy - 16} L ${h.cx + 8} ${h.cy - 12}`}
              stroke="white"
              strokeWidth="1.5"
              strokeOpacity="0.3"
              strokeLinecap="round"
              fill="none"
            />
          </React.Fragment>
        ))}
      </g>
    </svg>
  );
};
