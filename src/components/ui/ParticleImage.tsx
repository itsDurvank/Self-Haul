'use client';

import React, { useRef, useEffect } from 'react';

export interface ParticleImageProps {
  imageSrc?: string;
  width?: number;
  height?: number;
  particleSize?: number;
  particleGap?: number;
  swirlForce?: number;
  mouseRadius?: number;
  className?: string;
  accentColor?: string;
}

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  angle: number;
}

export const ParticleImage: React.FC<ParticleImageProps> = ({
  imageSrc,
  width = 300,
  height = 300,
  particleSize = 1.8,
  particleGap = 3,
  swirlForce = 8,
  mouseRadius = 100,
  className = '',
  accentColor = '#00f0ff',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, isHovered: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDestroyed = false;

    // Helper to generate default orb texture canvas if imageSrc is not provided
    const createDefaultOrbCanvas = (w: number, h: number) => {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return offCanvas;

      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.min(w, h) * 0.38;

      // Outer ethereal ring
      const grad = offCtx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(0, 240, 255, 0.95)');
      grad.addColorStop(0.6, 'rgba(147, 51, 234, 0.75)');
      grad.addColorStop(0.9, 'rgba(239, 68, 68, 0.5)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      offCtx.fill();

      // Inner sacred geometry lines
      offCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      offCtx.lineWidth = 1.5;

      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = centerX + Math.cos(angle) * (radius * 0.55);
        const py = centerY + Math.sin(angle) * (radius * 0.55);
        offCtx.beginPath();
        offCtx.arc(px, py, radius * 0.35, 0, Math.PI * 2);
        offCtx.stroke();
      }

      return offCanvas;
    };

    const initParticlesFromCanvasSource = (sourceCanvas: HTMLCanvasElement | HTMLImageElement) => {
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = width;
      sampleCanvas.height = height;
      const sampleCtx = sampleCanvas.getContext('2d');
      if (!sampleCtx) return;

      sampleCtx.drawImage(sourceCanvas, 0, 0, width, height);
      const imgData = sampleCtx.getImageData(0, 0, width, height).data;

      const newParticles: Particle[] = [];

      for (let y = 0; y < height; y += particleGap) {
        for (let x = 0; x < width; x += particleGap) {
          const index = (y * width + x) * 4;
          const alpha = imgData[index + 3] / 255;

          if (alpha > 0.15) {
            const r = imgData[index];
            const g = imgData[index + 1];
            const b = imgData[index + 2];

            // Add slight random offset to origin for organic dispersion
            newParticles.push({
              x: x + (Math.random() - 0.5) * 40,
              y: y + (Math.random() - 0.5) * 40,
              originX: x,
              originY: y,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              size: particleSize * (0.8 + Math.random() * 0.5),
              color: `rgb(${r}, ${g}, ${b})`,
              alpha: alpha,
              angle: Math.random() * Math.PI * 2,
            });
          }
        }
      }

      particlesRef.current = newParticles;
    };

    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      img.onload = () => {
        if (!isDestroyed) initParticlesFromCanvasSource(img);
      };
    } else {
      const defaultCanvas = createDefaultOrbCanvas(width, height);
      initParticlesFromCanvasSource(defaultCanvas);
    }

    const render = () => {
      if (isDestroyed) return;
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Calculate distance from mouse cursor
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (mouse.isHovered && dist < mouseRadius) {
          // Swirl and push force
          const force = (1 - dist / mouseRadius) * swirlForce;
          const angle = Math.atan2(dy, dx) + Math.PI / 2 + (Math.random() - 0.5) * 0.2;

          p.vx += Math.cos(angle) * force * 0.8;
          p.vy += Math.sin(angle) * force * 0.8;
        }

        // Spring return force to origin
        const homeDx = p.originX - p.x;
        const homeDy = p.originY - p.y;
        p.vx += homeDx * 0.04;
        p.vy += homeDy * 0.04;

        // Friction damping
        p.vx *= 0.86;
        p.vy *= 0.86;

        p.x += p.vx;
        p.y += p.vy;

        // Render particle
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isDestroyed = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [imageSrc, width, height, particleSize, particleGap, swirlForce, mouseRadius]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovered: true,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current = { x: -9999, y: -9999, isHovered: false };
  };

  return (
    <div className={`relative flex items-center justify-center pointer-events-auto select-none ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer touch-none"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    </div>
  );
};

export default ParticleImage;
