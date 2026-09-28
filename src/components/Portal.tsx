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
  const isRephrasing = percent < 100;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser strictly blocks unmuted autoplay without prior interaction, fallback to muted
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, []);

  const handleSkip = () => {
    if (isRephrasing) return; // Locked while rephrasing
    soundEngine.playButtonClickSound();
    onComplete();
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] bg-black overflow-hidden select-none z-50 flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
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
          elasticity={isRephrasing ? 0 : 0.25}
          padding="10px 20px"
          onClick={isRephrasing ? undefined : handleSkip}
          style={{
            background: isRephrasing
              ? 'radial-gradient(circle at 50% 0%, rgba(20, 25, 40, 0.75) 0%, rgba(10, 15, 25, 0.9) 100%)'
              : 'radial-gradient(circle at 50% 0%, rgba(30, 58, 138, 0.45) 0%, rgba(10, 20, 45, 0.8) 70%, rgba(5, 10, 25, 0.95) 100%)',
            boxShadow: isRephrasing
              ? 'inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 4px 15px rgba(0, 0, 0, 0.5)'
              : 'inset 0 1px 1px rgba(147, 197, 253, 0.3), 0 4px 20px rgba(15, 23, 42, 0.6)',
            cursor: isRephrasing ? 'not-allowed' : 'pointer',
            opacity: isRephrasing ? 0.75 : 1,
          }}
          className={`text-xs font-mono font-semibold tracking-widest ${
            isRephrasing ? 'text-zinc-400 border border-zinc-700/50' : 'text-indigo-100 hover:text-white border border-indigo-400/35 hover:border-indigo-300/70'
          } transition-all duration-300 focus:outline-none`}
        >
          <div className="flex items-center gap-2.5">
            {isRephrasing ? (
              <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin shrink-0" />
            ) : (
              <FastForward className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            )}
            <span>{isRephrasing ? 'REPHRASING IN PROGRESS...' : 'SKIP TRANSITION'}</span>
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
