'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BlackHole } from './BlackHole';
import { ArrowRight, ArrowLeft, CornerDownLeft, Sparkles, Wind, LogOut, User } from 'lucide-react';
import { soundEngine } from '@/lib/audio';
import { LiquidGlass } from '@/components/ui/LiquidGlass';

interface DumpScreenProps {
  questionCount: number;
  onAddQuestion: (text: string) => void;
  onProceedToReady: () => void;
  onGoHome?: () => void;
  userEmail?: string;
  userName?: string;
  onSignOut?: () => void;
}

interface SunkTextAnimation {
  id: string;
  text: string;
}

export const DumpScreen: React.FC<DumpScreenProps> = ({
  questionCount,
  onAddQuestion,
  onProceedToReady,
  onGoHome,
  userEmail,
  userName,
  onSignOut,
}) => {
  const [inputText, setInputText] = useState('');
  const [sunkText, setSunkText] = useState<SunkTextAnimation | null>(null);
  const [isAbsorbing, setIsAbsorbing] = useState(false);
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const [isBreathingMode, setIsBreathingMode] = useState(false);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const particles = useMemo(() => {
    if (!sunkText) return [];
    const text = sunkText.text;
    const total = text.length;
    const maxCharsPerLine = typeof window !== 'undefined' && window.innerWidth < 768 ? 45 : 120;

    return text.split('').map((char, index) => {
      const lineIndex = Math.floor(index / maxCharsPerLine);
      const colIndex = index % maxCharsPerLine;
      const charsOnThisLine = Math.min(
        maxCharsPerLine,
        total - lineIndex * maxCharsPerLine
      );

      const centerOffset = (colIndex - charsOnThisLine / 2) * 11;
      const lineYOffset = 130 + lineIndex * 30;

      const randomX = (Math.random() - 0.5) * 90;
      const randomY = (Math.random() - 0.5) * 70;
      const randomRotate = (Math.random() - 0.5) * 480;

      return {
        key: `${sunkText.id}-${index}`,
        char,
        index,
        centerOffset,
        lineYOffset,
        randomX,
        randomY,
        randomRotate,
      };
    });
  }, [sunkText?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();

    if (!trimmed) {
      if (questionCount > 0) {
        soundEngine.playButtonClickSound();
        onProceedToReady();
      }
      return;
    }

    soundEngine.playEnterKeySound();

    // Trigger text swallow animation
    const animId = crypto.randomUUID();
    setSunkText({ id: animId, text: trimmed });
    setIsAbsorbing(true);
    setPulseTrigger((prev) => prev + 1);

    onAddQuestion(trimmed);
    setInputText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setTimeout(() => {
      setIsAbsorbing(false);
      setSunkText(null);
    }, 1200);
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between p-4 sm:p-8 bg-[#030306] text-zinc-100 overflow-hidden select-none">
      {/* Top-Left Rigid Logo Icon & Expanding Profile Card */}
      <div className="fixed top-6 left-6 sm:top-7 sm:left-8 z-50">
        {/* Invisible Backdrop when expanded */}
        {isProfileCardOpen && (
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setIsProfileCardOpen(false)}
          />
        )}

        {/* Rigid Fixed Logo Button - Pitch Dark LiquidGlass Style */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playButtonClickSound();
            setIsProfileCardOpen((prev) => !prev);
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
            boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35), 0 10px 25px rgba(0, 0, 0, 0.9)',
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-100 border border-white/20 hover:border-white/50 backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 z-50 relative shrink-0"
          title={!isProfileCardOpen && userName ? `Logged in as ${userName}` : undefined}
        >
          <User className="w-4 h-4 text-zinc-100 shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
        </button>

        {/* Animated Expanding Card Container - Pitch Dark LiquidGlass Style */}
        <AnimatePresence>
          {isProfileCardOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, originX: 0, originY: 0 }}
              animate={{ opacity: 1, scale: 1, originX: 0, originY: 0 }}
              exit={{ opacity: 0, scale: 0.88, originX: 0, originY: 0 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)',
                boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.25), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.05), 0 35px 90px rgba(0, 0, 0, 0.98)',
              }}
              className="absolute -top-3 -left-3 z-40 w-72 sm:w-80 rounded-2xl border border-white/20 bg-[#030306]/92 backdrop-blur-2xl p-3.5 pt-3.5 shadow-2xl flex flex-col space-y-3.5"
            >
              {/* Top Row: Rigid logo at top-left + Name & Email in front */}
              <div className="flex items-center justify-between">
                {/* Pl-12 offset for rigid logo button + Name & Email in front */}
                <div className="flex items-center overflow-hidden pl-12 pt-0.5">
                  <div className="overflow-hidden space-y-0.5 text-left">
                    <h4 className="text-sm font-semibold font-sans text-white tracking-wide truncate">
                      {userName || 'Anonymous Traveler'}
                    </h4>
                    <p className="text-[11px] font-mono text-zinc-400 truncate">
                      {userEmail || 'Guest Mode'}
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playButtonClickSound();
                    setIsProfileCardOpen(false);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer mr-1 shrink-0"
                  title="Close card"
                >
                  <span className="text-xs font-mono">✕</span>
                </button>
              </div>

              {/* Sign Out Action Button */}
              {onSignOut && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playButtonClickSound();
                    setIsProfileCardOpen(false);
                    onSignOut();
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.05) 100%)',
                    boxShadow: 'inset 0 1px 1px 0 rgba(254, 202, 202, 0.2), 0 10px 25px rgba(0, 0, 0, 0.5)',
                  }}
                  className="w-full py-2.5 px-3 rounded-xl hover:bg-red-500/25 text-red-200 hover:text-white border border-red-500/35 transition-all font-mono text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span>Sign Out</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Top Bar / Counter & LOWER-SELF Projection */}
      <div className="w-full max-w-2xl flex items-center justify-between pt-2 z-10">
        {/* Left Side: THE VOID Title */}
        <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-widest text-zinc-300 uppercase">
          <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
          <span>THE VOID</span>
        </div>

        {/* Top-Right LOWER-SELF Projection */}
        <div className="flex items-center gap-2 sm:gap-3">

          <LiquidGlass
            aberrationIntensity={1.8}
            blurAmount={0.06}
            borderRadius={100}
            displacementScale={30}
            elasticity={0.2}
            padding="6px 16px"
            glowOnHoverOnly={true}
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(130, 0, 0, 0.95) 0%, rgba(45, 0, 0, 0.98) 100%)',
              boxShadow: 'inset 0 1px 1px rgba(248, 113, 113, 0.35), 0 0 15px rgba(130, 0, 0, 0.6)',
            }}
            className="text-xs font-mono font-semibold tracking-[0.2em] text-red-100 border border-red-800/80"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_#dc2626] shrink-0" />
              <span>LOWER-SELF</span>
            </div>
          </LiquidGlass>
        </div>
      </div>

      {/* Question Counter Badge wrapped in LiquidGlass */}
      <div className="fixed top-6 right-20 sm:right-[76px] z-50">
        <LiquidGlass
          aberrationIntensity={1.5}
          blurAmount={0.06}
          borderRadius={100}
          displacementScale={30}
          elasticity={0.2}
          padding="6px 14px"
          className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-200"
        >
          <span>{questionCount} {questionCount === 1 ? 'QUESTION' : 'QUESTIONS'}</span>
        </LiquidGlass>
      </div>

      {/* Breathing Pause Overlay */}
      <AnimatePresence>
        {isBreathingMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-[#030306]/96 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center space-y-8 select-none"
          >
            {/* Breathing Circle with LiquidGlass */}
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <LiquidGlass
                aberrationIntensity={2}
                blurAmount={0.08}
                borderRadius={999}
                displacementScale={40}
                elasticity={0.35}
                padding="0px"
                className="w-36 h-36 flex items-center justify-center border border-emerald-500/40"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Wind className="w-10 h-10 text-emerald-400 animate-pulse" />
                </div>
              </LiquidGlass>
            </motion.div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-2xl sm:text-4xl font-sans font-medium tracking-wide text-white">
                Breathe In. Breathe Out.
              </h3>
              <p className="text-sm sm:text-base font-sans text-zinc-300 tracking-wide font-normal leading-relaxed">
                Clear your mind before dumping your thoughts into the void.
              </p>
            </div>

            {/* Return to Void Button with LiquidGlass */}
            <LiquidGlass
              aberrationIntensity={1.5}
              blurAmount={0.06}
              borderRadius={100}
              displacementScale={30}
              elasticity={0.25}
              padding="10px 24px"
              onClick={() => {
                soundEngine.playBreathingSound();
                setIsBreathingMode(false);
              }}
              className="flex items-center justify-center text-xs font-mono tracking-[0.25em] uppercase text-emerald-300 hover:text-white transition-colors cursor-pointer border border-emerald-500/40"
            >
              <span>Return to Void</span>
            </LiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Central Black Hole & Motion Character Disintegration Layer */}
      <div className="relative flex flex-col items-center justify-center my-auto z-10 w-full">
        <BlackHole isAbsorbing={isAbsorbing} pulseTrigger={pulseTrigger} size={320} />

        {/* Character Particle Disintegration Animation into Void */}
        <AnimatePresence>
          {sunkText && particles.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              {particles.map((p) => (
                <motion.span
                  key={p.key}
                  initial={{
                    opacity: 1,
                    x: p.centerOffset,
                    y: p.lineYOffset,
                    scale: 1,
                    rotate: 0,
                    filter: 'blur(0px)',
                  }}
                  animate={{
                    opacity: [1, 1, 0.7, 0],
                    x: [p.centerOffset, p.centerOffset * 0.4 + p.randomX, 0],
                    y: [p.lineYOffset, p.lineYOffset * 0.4 + p.randomY, -5],
                    scale: [1, 1.35, 0.25, 0],
                    rotate: [0, p.randomRotate, p.randomRotate * 1.8],
                    filter: ['blur(0px)', 'blur(1px)', 'blur(12px)'],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.95,
                    delay: p.index * 0.014,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="absolute inline-block font-sans font-bold text-base sm:text-xl text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] drop-shadow-[0_0_18px_rgba(251,191,36,0.4)] drop-shadow-[0_0_25px_rgba(56,189,248,0.25)] tracking-wide"
                >
                  {p.char === ' ' ? '\u00A0' : p.char}
                </motion.span>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Central Type Bar */}
      <div className="w-full max-w-xl flex flex-col items-center space-y-3 z-20 pb-4 relative">
        <form onSubmit={handleSubmit} className="w-full relative">
          <LiquidGlass
            aberrationIntensity={1.8}
            blurAmount={0.08}
            borderRadius={24}
            displacementScale={40}
            elasticity={0.2}
            padding="4px"
            glowOnHoverOnly={true}
            className="w-full border border-white/15 focus-within:border-white/40 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.6)] relative flex items-center"
          >
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={1}
              placeholder="What's on your mind..."
              className="w-full px-6 py-4 rounded-[20px] bg-transparent text-zinc-100 placeholder-zinc-400 font-sans text-base sm:text-lg focus:outline-none pr-14 tracking-wide resize-none min-h-[58px] max-h-[180px] custom-scrollbar overflow-y-auto leading-relaxed"
              autoFocus
            />
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.88 }}
              type="submit"
              className="absolute right-3.5 bottom-3.5 p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all focus:outline-none z-20"
              title="Swallow Question"
            >
              <CornerDownLeft className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
            </motion.button>
          </LiquidGlass>
        </form>
      </div>

      {/* Bottom-Right Corner Action Stack: I AM READY (top) + TAKE A MOMENT (bottom) */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-30 flex flex-col items-end gap-3">
        {/* I AM READY Button (stacked above Take a Moment) */}
        <AnimatePresence>
          {questionCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 12 }}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.93, y: 1 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              className="relative rounded-full p-[2px] overflow-hidden group shadow-[0_0_22px_rgba(255,255,255,0.4)] cursor-pointer"
            >
              {/* Outer Volumetric Monochrome Rotating Glow Aura */}
              <div
                className="absolute inset-[-160%] animate-border-spin blur-md opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background:
                    'conic-gradient(from 0deg at 50% 50%, #ffffff 0deg, #e4e4e7 90deg, transparent 180deg, #a1a1aa 270deg, #ffffff 360deg)',
                }}
              />

              {/* Crisp Monochrome Rotating Border Light Beam */}
              <div
                className="absolute inset-[-160%] animate-border-spin pointer-events-none"
                style={{
                  background:
                    'conic-gradient(from 0deg at 50% 50%, #ffffff 0deg, #e4e4e7 90deg, transparent 180deg, #d4d4d8 270deg, #ffffff 360deg)',
                }}
              />

              {/* Inner Glass Button */}
              <button
                onClick={() => {
                  soundEngine.playButtonClickSound();
                  onProceedToReady();
                }}
                className="relative flex items-center justify-center p-3 rounded-full bg-white hover:bg-zinc-100 text-black transition-all duration-300 backdrop-blur-2xl shadow-[0_0_25px_rgba(255,255,255,0.5)] focus:outline-none"
                title="Proceed"
              >
                <ArrowRight className="w-5 h-5 text-black group-hover:translate-x-0.5 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Take a Moment Button with Soothing Rotating Pink Border Beam */}
        <motion.div
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.93, y: 1 }}
          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
          className="relative rounded-full p-[2px] overflow-hidden group shadow-[0_0_22px_rgba(244,114,182,0.4)] cursor-pointer"
        >
          {/* Outer Volumetric Pink Rotating Glow Aura */}
          <div
            className="absolute inset-[-160%] animate-border-spin blur-md opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{
              background:
                'conic-gradient(from 0deg at 50% 50%, #ec4899 0deg, #f43f5e 90deg, transparent 180deg, #fb7185 270deg, #ec4899 360deg)',
            }}
          />

          {/* Crisp Rotating Pink Border Light Beam */}
          <div
            className="absolute inset-[-160%] animate-border-spin pointer-events-none"
            style={{
              background:
                'conic-gradient(from 0deg at 50% 50%, #f472b6 0deg, #e11d48 90deg, transparent 180deg, #fb7185 270deg, #f472b6 360deg)',
            }}
          />

          {/* Inner Glass Pink Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playBreathingSound();
              setIsBreathingMode((prev) => !prev);
            }}
            className="relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#120712]/90 hover:bg-[#1a0b1b]/95 text-pink-200 text-xs font-mono font-semibold tracking-wide transition-all duration-300 backdrop-blur-2xl whitespace-nowrap focus:outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]"
          >
            <Wind className="w-4 h-4 text-pink-400 animate-pulse" />
            <span>{isBreathingMode ? 'Resume' : 'Take a Moment'}</span>
          </button>
        </motion.div>
      </div>

      {/* Bottom-Left Corner Home Action Button wrapped in LiquidGlass */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.93, y: 1 }}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        className="fixed bottom-6 left-6 sm:bottom-8 sm:left-8 z-30 pointer-events-auto"
      >
        <LiquidGlass
          aberrationIntensity={1.5}
          blurAmount={0.06}
          borderRadius={999}
          displacementScale={30}
          elasticity={0.25}
          padding="12px"
          onClick={() => {
            soundEngine.playButtonClickSound();
            if (onGoHome) onGoHome();
          }}
          className="flex items-center justify-center text-zinc-200 hover:text-white cursor-pointer transition-all duration-300 focus:outline-none border border-white/20 hover:border-white/50 shadow-2xl"
          title="Return to Home"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-100" />
        </LiquidGlass>
      </motion.div>
    </div>
  );
};
