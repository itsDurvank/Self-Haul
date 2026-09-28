'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '@/types/selfhaul';
import { soundEngine } from '@/lib/audio';
import { Sparkles, ArrowRight, SkipForward } from 'lucide-react';
import { LiquidGlass } from '@/components/ui/LiquidGlass';

interface AnswerScreenProps {
  currentQuestion: Question | null;
  currentIndex: number;
  totalQuestions: number;
  onAnswerSubmit: (answerText: string) => void;
  onSkipQuestion: () => void;
}

export const AnswerScreen: React.FC<AnswerScreenProps> = ({
  currentQuestion,
  currentIndex,
  totalQuestions,
  onAnswerSubmit,
  onSkipQuestion,
}) => {
  const [answer, setAnswer] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setAnswer('');
    soundEngine.playAstralChime();
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentQuestion?.id]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentQuestion) return;

    soundEngine.playButtonClickSound();
    onAnswerSubmit(answer.trim());
  };

  const handleSkip = () => {
    soundEngine.playButtonClickSound();
    onSkipQuestion();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between p-6 sm:p-12 bg-[#030306] text-zinc-100 overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-zinc-800/10 rounded-full blur-[200px] pointer-events-none z-0" />

      {/* Top Bar Progress */}
      <div className="w-full max-w-2xl flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-widest text-zinc-300 uppercase">
          <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
          <span>NOW ASK YOURSELF</span>
        </div>

        <div className="flex items-center gap-3">
          <LiquidGlass
            aberrationIntensity={1.5}
            blurAmount={0.06}
            borderRadius={100}
            displacementScale={30}
            elasticity={0.2}
            padding="6px 14px"
            className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-200"
          >
            <span>{currentIndex + 1} / {totalQuestions}</span>
          </LiquidGlass>

          {/* Top-Right HIGHER-SELF Projection Badge */}
          <LiquidGlass
            aberrationIntensity={1.8}
            blurAmount={0.06}
            borderRadius={100}
            displacementScale={30}
            elasticity={0.2}
            padding="6px 16px"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(0, 180, 255, 0.35) 0%, rgba(2, 45, 90, 0.85) 100%)',
              boxShadow: 'inset 0 1px 1px rgba(125, 211, 252, 0.5), 0 0 15px rgba(0, 180, 255, 0.3)',
            }}
            className="text-xs font-mono font-semibold tracking-[0.2em] text-cyan-100 border border-cyan-400/50"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff] shrink-0" />
              <span>HIGHER-SELF</span>
            </div>
          </LiquidGlass>
        </div>
      </div>

      {/* Center Question & Textarea Area */}
      <div className="w-full max-w-2xl my-auto z-10 space-y-6 flex flex-col items-center">
        {/* Animated AI Orb Video Container */}
        <div
          className="relative w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center pointer-events-none select-none my-2 overflow-hidden"
          style={{
            WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0) 86%)',
            maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0) 86%)',
          }}
        >
          <video
            src="/media/video/ai-orb.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-95"
          >
            <source src="/media/video/ai-orb.mp4" type="video/mp4" />
          </video>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id + (currentQuestion.rephrasedText ? '-rephrased' : '-raw')}
            initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
            transition={{ duration: 0.6 }}
            className="w-full text-center space-y-4"
          >
            {currentQuestion.rephrasedText ? (
              <h2 className="text-2xl sm:text-4xl font-serif font-light text-zinc-100 leading-snug px-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                &ldquo;{currentQuestion.rephrasedText}&rdquo;
              </h2>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 py-2">
                <h2 className="text-2xl sm:text-4xl font-serif font-light text-zinc-300/80 leading-snug px-4 italic drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  &ldquo;{currentQuestion.text}&rdquo;
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono text-indigo-300/80 tracking-widest uppercase bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-500/20 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  <span>Deepening perspective...</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Calm Textarea inside LiquidGlass */}
        <div className="w-full space-y-4">
          <LiquidGlass
            aberrationIntensity={1.8}
            blurAmount={0.08}
            borderRadius={24}
            displacementScale={40}
            elasticity={0.2}
            padding="4px"
            glowOnHoverOnly={true}
            className="w-full border border-white/15 focus-within:border-white/40 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
          >
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={5}
              placeholder="Write your honest, unedited response..."
              className="w-full p-5 rounded-[20px] bg-transparent text-zinc-100 placeholder-zinc-400 font-sans text-base sm:text-lg focus:outline-none resize-none leading-relaxed"
            />
          </LiquidGlass>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <LiquidGlass
              aberrationIntensity={1.5}
              blurAmount={0.06}
              borderRadius={100}
              displacementScale={30}
              elasticity={0.25}
              padding="8px 16px"
              onClick={handleSkip}
              className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-300 hover:text-white cursor-pointer transition-all border border-white/15 hover:border-white/40"
            >
              <div className="flex items-center gap-2">
                <SkipForward className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Skip for now</span>
              </div>
            </LiquidGlass>

            <LiquidGlass
              aberrationIntensity={1.5}
              blurAmount={0.06}
              borderRadius={100}
              displacementScale={30}
              elasticity={0.25}
              padding="10px 24px"
              onClick={() => handleSubmit()}
              className="font-mono font-bold text-xs sm:text-sm tracking-[0.2em] uppercase text-white hover:text-white cursor-pointer transition-all duration-300 focus:outline-none shadow-2xl border border-white/30 hover:border-white/60"
            >
              <div className="flex items-center gap-2">
                <span>{answer.trim() ? 'Record Answer' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4 text-white shrink-0" />
              </div>
            </LiquidGlass>
          </div>
        </div>
      </div>

      {/* Bottom Shortcut hint */}
      <div className="text-xs text-zinc-400 font-mono font-medium tracking-wider z-10">
        Press [ Ctrl + Enter ] or tap Record Answer to save
      </div>
    </div>
  );
};
