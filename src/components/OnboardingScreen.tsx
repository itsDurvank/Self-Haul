'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, ArrowRight, Compass, HeartHandshake } from 'lucide-react';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { soundEngine } from '@/lib/audio';

interface OnboardingScreenProps {
  initialEmail?: string;
  onSubmitProfile: (profile: { fullName: string; moniker: string; intent: string }) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialEmail = '',
  onSubmitProfile,
}) => {
  const [fullName, setFullName] = useState('');
  const [moniker, setMoniker] = useState('');
  const [intent, setIntent] = useState('Deep Self-Reflection');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playEnterKeySound();

    if (!fullName.trim()) return;

    setLoading(true);
    const finalMoniker = moniker.trim() || fullName.trim().split(' ')[0];

    setTimeout(() => {
      onSubmitProfile({
        fullName: fullName.trim(),
        moniker: finalMoniker,
        intent,
      });
    }, 400);
  };

  return (
    <div className="min-h-screen w-screen bg-[#030306] relative overflow-hidden flex items-center justify-center p-4 select-none">
      {/* Pitch Dark Ambient Void Background */}
      <div className="absolute inset-0 bg-black pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-white/[0.02] blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[420px] relative z-10"
        style={{ perspective: 1500 }}
      >
        <LiquidGlass
          aberrationIntensity={1.8}
          blurAmount={0.1}
          borderRadius={32}
          displacementScale={35}
          elasticity={0.25}
          padding="36px 32px"
          glowOnHoverOnly={true}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
            boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.05), 0 35px 90px rgba(0, 0, 0, 0.98)',
          }}
          className="w-full border border-white/20 shadow-2xl"
        >
          <div className="w-full flex flex-col items-center">
            {/* Logo Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-12 h-12 rounded-full bg-gradient-to-b from-white/40 via-white/20 to-white/5 p-[1px] mb-4 shadow-[0_0_20px_rgba(255,255,255,0.12)] flex items-center justify-center backdrop-blur-md"
            >
              <div className="w-full h-full rounded-full bg-black/80 flex items-center justify-center overflow-hidden relative">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
            </motion.div>

            {/* Header Title */}
            <div className="text-center mb-6 space-y-1">
              <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
                Welcome to Self-Haul
              </h1>
              <p className="text-xs text-zinc-400 font-sans">
                Set up your Identity Profile before entering The Void
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              {/* Full Name */}
              <div className="w-full space-y-1 text-left">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider pl-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    required
                    className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-white/40 backdrop-blur-md rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-zinc-500 outline-none transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                  />
                </div>
              </div>

              {/* Display Moniker */}
              <div className="w-full space-y-1 text-left">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider pl-1">
                  Display Moniker (Shown in The Void)
                </label>
                <div className="relative flex items-center">
                  <Compass className="absolute left-4 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={moniker}
                    onChange={(e) => setMoniker(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-white/40 backdrop-blur-md rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder-zinc-500 outline-none transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                  />
                </div>
              </div>

              {/* Intent Dropdown */}
              <div className="w-full space-y-1 text-left">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider pl-1">
                  Primary Intent
                </label>
                <div className="relative flex items-center">
                  <HeartHandshake className="absolute left-4 w-4 h-4 text-zinc-400" />
                  <select
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-white/40 backdrop-blur-md rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white outline-none transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] appearance-none cursor-pointer"
                  >
                    <option value="Deep Self-Reflection" className="bg-zinc-900 text-white">Deep Self-Reflection</option>
                    <option value="Clarity & Growth" className="bg-zinc-900 text-white">Clarity & Growth</option>
                    <option value="Stress & Anxiety Release" className="bg-zinc-900 text-white">Stress & Anxiety Release</option>
                    <option value="Creative Problem Solving" className="bg-zinc-900 text-white">Creative Problem Solving</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 mt-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-sans font-medium text-sm border border-white/20 backdrop-blur-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <span>Enter The Void</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </LiquidGlass>
      </motion.div>
    </div>
  );
};
