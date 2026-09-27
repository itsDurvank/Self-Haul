'use client';

import React, { useRef, useState, useEffect } from 'react';

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  aberrationIntensity?: number;
  blurAmount?: number;
  borderRadius?: number;
  displacementScale?: number;
  elasticity?: number;
  padding?: string;
  saturation?: number;
  mode?: 'standard' | 'polar' | 'prominent' | 'shader';
  glowOnHoverOnly?: boolean;
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  aberrationIntensity = 2,
  blurAmount = 0.08,
  borderRadius = 100,
  displacementScale = 50,
  elasticity = 0.3,
  padding = '14px 24px',
  saturation = 140,
  mode = 'standard',
  glowOnHoverOnly = false,
  className = '',
  style,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0.5, y: 0.5 });
  };

  const offsetX = (mousePos.x - 0.5) * 15 * elasticity;
  const offsetY = (mousePos.y - 0.5) * 15 * elasticity;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        padding: padding,
        borderRadius: `${borderRadius}px`,
        backdropFilter: `blur(${blurAmount * 120}px) saturate(${saturation}%)`,
        WebkitBackdropFilter: `blur(${blurAmount * 120}px) saturate(${saturation}%)`,
        transform: isHovered ? `translate3d(${offsetX}px, ${offsetY}px, 0)` : 'translate3d(0, 0, 0)',
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
        ...style,
      }}
      className={`relative overflow-hidden ${style?.background ? '' : 'bg-white/5'} border border-white/20 ${style?.boxShadow || className.includes('shadow-') ? '' : 'shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'} ${className}`}
      {...props}
    >
      {/* Liquid Refractive Edge Glow & Chromatic Aberration Rim */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          borderRadius: `${borderRadius}px`,
          background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 45%, transparent 70%)`,
          opacity: glowOnHoverOnly ? (isHovered ? 1 : 0) : 1,
          boxShadow: isHovered
            ? `inset 0 0 15px rgba(255, 255, 255, 0.3), 0 0 25px rgba(255, 255, 255, 0.2)`
            : `inset 0 0 8px rgba(255, 255, 255, 0.15)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default LiquidGlass;
