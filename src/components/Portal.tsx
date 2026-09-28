'use client';

import React, { useEffect, useRef } from 'react';
import { Question } from '@/types/selfhaul';
import { soundEngine } from '@/lib/audio';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { FastForward, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface PortalProps {
  questions?: Question[];
  onComplete: () => void;
}

export const Portal: React.FC<PortalProps> = ({ questions = [], onComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const total = questions.length;
  const rephrasedCount = questions.filter((q) => Boolean(q.rephrasedText)).length;
  const percent = total > 0 ? Math.round((rephrasedCount / total) * 100) : 100;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, []);

  const handleSkip = () => {
    soundEngine.playButtonClickSound();
    onComplete();
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] bg-black overflow-hidden select-none z-50 flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={onComplete}
        className="w-full h-full object-cover"
      >
        <source src="/media/video/transition-video.mp4" type="video/mp4" />
      </video>

      {/* Bottom Left Skip Transition Button + Sleek Progress Line Below */}
      <div className="fixed bottom-6 left-6 sm:bottom-10 sm:left-10 z-50 flex flex-col items-center">
        <LiquidGlass
          aberrationIntensity={1.8}
          blurAmount={0.08}
          borderRadius={100}
          displacementScale={35}
          elasticity={0.25}
          padding="10px 20px"
          onClick={handleSkip}
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(30, 58, 138, 0.45) 0%, rgba(10, 20, 45, 0.8) 70%, rgba(5, 10, 25, 0.95) 100%)',
            boxShadow: 'inset 0 1px 1px rgba(147, 197, 253, 0.3), 0 4px 20px rgba(15, 23, 42, 0.6)',
          }}
          className="text-xs font-mono font-semibold tracking-widest text-indigo-100 hover:text-white cursor-pointer transition-all duration-300 focus:outline-none border border-indigo-400/35 hover:border-indigo-300/70"
        >
          <div className="flex items-center gap-2.5">
            {percent < 100 ? (
              <Loader2 className="w-3.5 h-3.5 text-indigo-300 animate-spin shrink-0" />
            ) : (
              <FastForward className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            )}
            <span>{percent < 100 ? 'REPHRASING IN PROGRESS...' : 'SKIP TRANSITION'}</span>
          </div>
        </LiquidGlass>

        {/* Sleek Thin Progress Bar Line Below Button */}
        <div className="w-full h-1 bg-indigo-950/70 rounded-full border border-indigo-500/30 overflow-hidden mt-2 backdrop-blur-md">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-400 to-cyan-400 shadow-[0_0_8px_#818cf8]"
          />
        </div>
      </div>
    </div>
  );
};
