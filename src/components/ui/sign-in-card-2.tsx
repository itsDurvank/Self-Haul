'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Eye, EyeClosed } from 'lucide-react';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "w-full bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/15 focus:border-white/40 backdrop-blur-md rounded-2xl px-5 py-3.5 text-sm text-white placeholder-zinc-400 outline-none transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]",
        className
      )}
      {...props}
    />
  );
}

export interface SignInCard2Props {
  onSignIn?: (email: string, password?: string) => void;
  onSignUp?: (email: string, password: string, fullName: string) => void;
  onGoogleSignIn?: () => void;
  onMagicLinkSignIn?: (email: string) => void;
  isLoading?: boolean;
  errorMsg?: string | null;
  successMsg?: string | null;
}

export function Component({
  onSignIn,
  onSignUp,
  onGoogleSignIn,
  onMagicLinkSignIn,
  isLoading: externalLoading,
  errorMsg,
  successMsg,
}: SignInCard2Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);

  // Load remembered email from localStorage on mount
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedEmail = localStorage.getItem('self_haul_remembered_email');
        if (savedEmail) setEmail(savedEmail);
      }
    } catch (e) {
      console.warn('Failed to load remembered email:', e);
    }
  }, []);

  // Save email to localStorage as user types
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    try {
      if (typeof window !== 'undefined' && val) {
        localStorage.setItem('self_haul_remembered_email', val.trim());
      }
    } catch (e) {
      console.warn('Failed to save email to storage:', e);
    }
  };

  const isLoading = externalLoading ?? internalLoading;

  // 3D Tilt Card effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [6, -6]);
  const rotateY = useTransform(mouseX, [-300, 300], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const isValidEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr.trim());
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSignUpMode) {
      if (onSignUp) {
        onSignUp(email, password, fullName);
      }
    } else {
      if (onSignIn) {
        onSignIn(email, password);
      } else {
        setInternalLoading(true);
        setTimeout(() => setInternalLoading(false), 2000);
      }
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#030306] relative overflow-hidden flex items-center justify-center p-4">
      {/* Pure Pitch Dark Ambient Canvas with Deep Void Lighting */}
      <div className="absolute inset-0 bg-black pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-white/[0.02] blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[400px] relative z-10"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Translucent Pitch Dark LiquidGlass Card */}
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
              {/* Minimalist Striped Orb Logo Icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-12 h-12 rounded-full bg-gradient-to-b from-white/40 via-white/20 to-white/5 p-[1px] mb-4 shadow-[0_0_20px_rgba(255,255,255,0.12)] flex items-center justify-center backdrop-blur-md"
              >
                <div className="w-full h-full rounded-full bg-black/80 flex items-center justify-center overflow-hidden relative">
                  {/* Diagonal stripes */}
                  <div className="absolute inset-0 opacity-80" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 2px, transparent 0, transparent 6px)',
                  }} />
                </div>
              </motion.div>

              {/* Header Title with AnimatePresence Crossfade */}
              <div className="text-center mb-6 space-y-1 min-h-[48px] flex flex-col items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={isSignUpMode ? 'signup-header' : 'signin-header'}
                    initial={{ opacity: 0, y: isSignUpMode ? 6 : -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: isSignUpMode ? -6 : 6 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col items-center"
                  >
                    <h1 className="text-2xl font-bold font-sans text-white tracking-tight drop-shadow-sm">
                      {isSignUpMode ? "Create Account" : "Self-Haul"}
                    </h1>
                    <p className="text-xs text-zinc-400 font-sans">
                      {isSignUpMode ? "Enter your details to join the ritual" : "Enter your space of reflection"}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Notification Messages */}
              {errorMsg && (
                <div className="w-full mb-5 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs text-center font-mono backdrop-blur-md">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="w-full mb-5 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs text-center font-mono backdrop-blur-md">
                  {successMsg}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                {/* Display Name Input with AnimatePresence Collapse Animation */}
                <AnimatePresence initial={false}>
                  {isSignUpMode && (
                    <motion.div
                      key="display-name-field"
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                      className="w-full relative overflow-hidden"
                    >
                      <Input
                        type="text"
                        placeholder="Display Name / Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={isSignUpMode}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email Input */}
                <div className="w-full relative">
                  <Input
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={handleEmailChange}
                    className={cn(
                      "transition-all duration-200",
                      email.length > 0 && !isValidEmail(email) && "border-amber-500/50 focus:border-amber-400",
                      email.length > 0 && isValidEmail(email) && "border-emerald-500/40 focus:border-emerald-400"
                    )}
                    required
                  />
                </div>

                {/* Password Input */}
                <div className="w-full relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "pr-11 transition-all duration-200",
                      password.length > 0 && password.length < 6 && "border-amber-500/50 focus:border-amber-400",
                      password.length >= 6 && "border-emerald-500/40 focus:border-emerald-400"
                    )}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <Eye className="w-4 h-4 text-white" /> : <EyeClosed className="w-4 h-4" />}
                  </button>
                </div>

                {/* Main Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 mt-1 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-sans font-medium text-sm border border-white/20 backdrop-blur-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={isSignUpMode ? 'submit-signup' : 'submit-signin'}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        transition={{ duration: 0.15 }}
                      >
                        {isSignUpMode ? "Sign Up" : "Sign in"}
                      </motion.span>
                    </AnimatePresence>
                  )}
                </motion.button>

                {/* Continue with Google Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-sans font-medium text-sm border border-white/15 backdrop-blur-lg shadow-md transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9c-.6-.7-1-1.5-1-2.3z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </motion.button>

                {/* Mode Toggle Footer Link with AnimatePresence */}
                <div className="text-center pt-3 text-xs text-zinc-400 font-sans min-h-[32px] flex items-center justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={isSignUpMode ? 'footer-signup' : 'footer-signin'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {isSignUpMode ? (
                        <>
                          Already have an account?{" "}
                          <button
                            type="button"
                            onClick={() => setIsSignUpMode(false)}
                            className="text-white underline font-medium hover:text-zinc-200 transition-colors ml-1 cursor-pointer"
                          >
                            Sign in
                          </button>
                        </>
                      ) : (
                        <>
                          Don't have an account?{" "}
                          <button
                            type="button"
                            onClick={() => setIsSignUpMode(true)}
                            className="text-white underline font-medium hover:text-zinc-200 transition-colors ml-1 cursor-pointer"
                          >
                            Sign up, it's free!
                          </button>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </form>
            </div>
          </LiquidGlass>
        </motion.div>
      </motion.div>
    </div>
  );
}
