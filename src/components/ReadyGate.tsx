'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '@/types/selfhaul';
import { soundEngine } from '@/lib/audio';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { EncryptedText } from '@/components/ui/encrypted-text';
import { TextFlippingBoard } from '@/components/ui/text-flipping-board';
import Hyperspeed from '@/components/ui/Hyperspeed';
import { LiquidGlass } from '@/components/ui/LiquidGlass';

const HYPERSPEED_OPTIONS = {
  distortion: 'turbulentDistortion',
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 30,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5] as [number, number],
  lightStickHeight: [1.3, 1.7] as [number, number],
  movingAwaySpeed: [60, 80] as [number, number],
  movingCloserSpeed: [-120, -160] as [number, number],
  carLightsLength: [400 * 0.03, 400 * 0.2] as [number, number],
  carLightsRadius: [0.05, 0.14] as [number, number],
  carWidthPercentage: [0.3, 0.5] as [number, number],
  carShiftX: [-0.8, 0.8] as [number, number],
  carFloorSeparation: [0, 5] as [number, number],
  colors: {
    roadColor: 0x030303,
    islandColor: 0x050505,
    background: 0x000000,
    shoulderLines: 0xffffff,
    brokenLines: 0xd4d4d8,
    leftCars: [0xffffff, 0xe4e4e7, 0xa1a1aa],
    rightCars: [0xffffff, 0xd4d4d8, 0x71717a],
    sticks: [0xffffff, 0xe4e4e7, 0xd4d4d8, 0xa1a1aa],
  }
};

const requestFullscreen = () => {
  try {
    const el = document.documentElement as any;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen().catch(() => {});
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen().catch(() => {});
    }
  } catch {
    // Ignore fullscreen denial/unsupported
  }
};

interface ReadyGateProps {
  questions: Question[];
  onStartPortal: () => void;
  onBackToDump: () => void;
  onRemoveQuestion: (id: string) => void;
}

export const ReadyGate: React.FC<ReadyGateProps> = ({
  questions,
  onStartPortal,
  onBackToDump,
  onRemoveQuestion,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        soundEngine.playButtonClickSound();
        requestFullscreen();
        onStartPortal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartPortal]);

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between p-6 sm:p-12 bg-[#030306] text-zinc-100 overflow-hidden select-none">
      {/* Hyperspeed Warp Tunnel Background Effect from React Bits */}
      <div className="absolute inset-0 z-0 opacity-85">
        <Hyperspeed effectOptions={HYPERSPEED_OPTIONS} />
      </div>

      {/* Ambient Relativistic Monochrome Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-zinc-800/15 rounded-full blur-[180px] pointer-events-none z-0" />

      {/* Top Right Question Counter Badge wrapped in LiquidGlass */}
      <div className="fixed top-6 right-20 sm:right-[76px] z-50">
        <LiquidGlass
          aberrationIntensity={1.5}
          blurAmount={0.06}
          borderRadius={100}
          displacementScale={30}
          elasticity={0.2}
          padding="6px 16px"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(35, 40, 52, 0.75) 0%, rgba(12, 14, 20, 0.85) 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
          className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-200 border border-white/20"
        >
          <span>{questions.length} {questions.length === 1 ? 'QUESTION' : 'QUESTIONS'} PREPARED</span>
        </LiquidGlass>
      </div>

      {/* Top Left Navigation Button wrapped in LiquidGlass */}
      <div className="fixed top-6 left-6 z-50">
        <LiquidGlass
          aberrationIntensity={1.5}
          blurAmount={0.06}
          borderRadius={100}
          displacementScale={30}
          elasticity={0.25}
          padding="6px 16px"
          onClick={() => {
            soundEngine.playButtonClickSound();
            onBackToDump();
          }}
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(35, 40, 52, 0.75) 0%, rgba(12, 14, 20, 0.85) 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
          className="flex items-center gap-2 text-xs font-mono font-semibold tracking-widest text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/20 hover:border-white/50"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-200" />
          <span>Add More Questions</span>
        </LiquidGlass>
      </div>

      {/* Center Gate Card */}
      <div className="flex flex-col items-center text-center max-w-md sm:max-w-2xl w-full my-auto space-y-4 -mt-3 sm:-mt-5 pt-2 z-10">
        {/* Official Aceternity UI Split-Flap TextFlippingBoard (Solely for Random Leader & Philosopher Quotes) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="w-full flex justify-center"
        >
          <TextFlippingBoard />
        </motion.div>

        {/* Question List Container - Extended height down towards bottom area with scroll */}
        <div className="w-full relative max-h-[48dvh] sm:max-h-[54dvh] overflow-y-auto space-y-3 px-2 py-1 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {questions.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full flex"
              >
                <LiquidGlass
                  aberrationIntensity={1.5}
                  blurAmount={0.04}
                  borderRadius={20}
                  displacementScale={30}
                  elasticity={0.2}
                  padding="14px 24px"
                  saturation={120}
                  glowOnHoverOnly={true}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3)',
                  }}
                  className="w-full border border-white/25 hover:border-white/45 transition-all duration-300"
                >
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2 max-w-[85%] text-left z-10 relative overflow-hidden">
                      <span className="text-zinc-400 font-mono font-semibold shrink-0">{idx + 1}.</span>
                      <div className="truncate text-sm font-sans tracking-wide text-zinc-100">
                        <EncryptedText text={`"${q.text}"`} className="text-zinc-200 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        soundEngine.playButtonClickSound();
                        onRemoveQuestion(q.id);
                      }}
                      className="text-zinc-400 hover:text-red-400 hover:bg-red-950/40 p-1.5 rounded-xl transition-all z-10 relative focus:outline-none shrink-0"
                      title="Remove question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </LiquidGlass>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>

      {/* Bottom Right Corner Action Stack: READY? (top) + [ ENTER PORTAL ] (middle) + Subtext (bottom) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-20 flex flex-col items-end space-y-2 pointer-events-auto"
      >
        <h2 className="text-3xl sm:text-5xl font-serif tracking-[0.2em] font-light text-white uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] pr-2 mb-1">
          READY?
        </h2>
        <LiquidGlass
          aberrationIntensity={1.5}
          blurAmount={0.06}
          borderRadius={100}
          displacementScale={30}
          elasticity={0.25}
          padding="14px 32px"
          onClick={() => {
            soundEngine.playButtonClickSound();
            requestFullscreen();
            onStartPortal();
          }}
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(35, 40, 52, 0.75) 0%, rgba(12, 14, 20, 0.85) 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
          className="font-mono font-bold text-sm sm:text-base tracking-[0.3em] uppercase text-white hover:text-white cursor-pointer transition-all duration-300 focus:outline-none shadow-2xl border border-white/30 hover:border-white/60"
        >
          <span>[ ENTER PORTAL ]</span>
        </LiquidGlass>
        <p className="text-xs text-zinc-300 font-mono tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] pr-2 font-medium">
          Press [ ENTER ] to begin the ritual
        </p>
      </motion.div>

      {/* Bottom Quiet Note */}
      <div className="text-xs text-zinc-400 font-mono text-center tracking-wider font-medium z-10">
        Your questions will return in shuffled order.
      </div>
    </div>
  );
};
