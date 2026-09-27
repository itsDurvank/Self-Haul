'use client';

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { soundEngine } from '@/lib/audio';
import { Sparkles } from 'lucide-react';
import { LiquidChrome } from '@/components/ui/LiquidChrome';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { InstallPwaButton } from '@/components/InstallPwaButton';

interface LandingProps {
  onEnter: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        soundEngine.playButtonClickSound();
        setTimeout(() => {
          onEnter();
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter]);

  const handleStart = () => {
    soundEngine.playButtonClickSound();
    setTimeout(() => {
      onEnter();
    }, 100);
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between p-6 sm:p-12 bg-[#030306] text-zinc-200 overflow-hidden select-none">
      {/* Liquid Chrome Background Layer from React Bits */}
      <div className="absolute inset-0 z-0 opacity-80 pointer-events-auto">
        <LiquidChrome
          baseColor={[0.1, 0.1, 0.1]}
          speed={0.3}
          amplitude={0.4}
          frequencyX={3}
          frequencyY={3}
          interactive={true}
        />
      </div>

      {/* Top Header */}
      <div className="flex items-center gap-3 z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ duration: 1 }}
          className="flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-zinc-300 font-mono bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-200" />
          <span>A Private Ritual</span>
        </motion.div>
        <InstallPwaButton />
      </div>

      {/* Center Hero Content */}
      <div className="flex flex-col items-center text-center max-w-xl space-y-8 z-10 my-auto">
        <motion.h1
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="text-5xl sm:text-7xl tracking-[0.25em] font-serif font-light text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-400 uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]"
        >
          SELF-HAUL
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="space-y-3 font-serif text-xl sm:text-3xl text-zinc-100 font-semibold tracking-wide leading-relaxed drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)]"
        >
          <p>You already know the questions.</p>
          <p className="text-zinc-200 font-medium italic">Put them down.</p>
        </motion.div>

      </div>

      {/* Bottom Right Corner Action Button & Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-20 flex flex-col items-end space-y-2 pointer-events-auto"
      >
        <LiquidGlass
          aberrationIntensity={1.5}
          blurAmount={0.06}
          borderRadius={100}
          displacementScale={30}
          elasticity={0.25}
          padding="14px 32px"
          onClick={handleStart}
          className="font-mono font-bold text-sm sm:text-base tracking-[0.25em] uppercase text-white hover:text-white cursor-pointer transition-all duration-300 focus:outline-none shadow-2xl border border-white/30 hover:border-white/60"
        >
          <span>Enter the Space</span>
        </LiquidGlass>
        <p className="text-xs text-zinc-300 font-mono tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] pr-2">
          Press [ ENTER ] or tap to begin
        </p>
      </motion.div>

    </div>
  );
};

