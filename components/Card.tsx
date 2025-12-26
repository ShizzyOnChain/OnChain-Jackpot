
import React from 'react';
import { COLORS } from '../constants';

interface CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  centerTitle?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  title, 
  subtitle, 
  children, 
  centerTitle = false,
  className = ""
}) => {
  return (
    <section
      className={`rounded-3xl border bg-white overflow-hidden ${className}`}
      style={{
        borderColor: COLORS.cardBorder,
        boxShadow: COLORS.shadow,
      }}
    >
      <div className="p-8">
        <div className={centerTitle ? "text-center" : ""}>
          <h2
            className="text-2xl font-bold font-display"
            style={{ color: COLORS.midnight }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 text-sm font-medium" style={{ color: COLORS.mintText }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
};
