'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { soundEngine } from '@/lib/audio';
import { Component as SignInCard2 } from '@/components/ui/sign-in-card-2';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { ArrowLeft } from 'lucide-react';

import { UserSession } from '@/types/selfhaul';

interface LoginScreenProps {
  onLoginSuccess: (user: UserSession) => void;
  onGoBack: () => void;
}

import { saveUserProfileToSupabase } from '@/lib/supabase/db';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onGoBack }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  const isValidEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr.trim());
  };

  const handleSignUp = async (email: string, password: string, fullName: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    soundEngine.playEnterKeySound();

    if (!email || !isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg('Please enter your display name.');
      return;
    }

    setLoading(true);

    try {
      const finalMoniker = fullName.trim();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: finalMoniker,
            moniker: finalMoniker,
            intent: 'Deep Self-Reflection',
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      if (data.user) {
        await saveUserProfileToSupabase(data.user.id, {
          fullName: finalMoniker,
          moniker: finalMoniker,
          intent: 'Deep Self-Reflection',
        });

        setSuccessMsg('Account created successfully! Welcome to Self-Haul.');
        setTimeout(() => {
          onLoginSuccess({
            id: data.user!.id,
            email: data.user!.email || email,
            fullName: finalMoniker,
            moniker: finalMoniker,
          });
        }, 800);
      }
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Sign up failed.';
      if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('rate_limit')) {
        message = 'Email rate limit reached. Turn off "Confirm email" in Supabase Auth Settings or wait a few minutes.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string, password?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    soundEngine.playEnterKeySound();

    if (!email || !isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    if (password && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    const getOrigin = () => {
      if (typeof window === 'undefined') return 'http://localhost:3000';
      return window.location.origin.replace('0.0.0.0', 'localhost');
    };

    try {
      if (!password) {
        // Attempt magic link if no password provided
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `${getOrigin()}` },
        });
        if (error) throw error;
        setSuccessMsg('Magic link sent! Check your email inbox to sign in.');
      } else {
        // Attempt Password Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error("Invalid email or password. If you don't have an account yet, please click 'Sign up, it's free!' below.");
          }
          throw error;
        }

        if (data.user) {
          onLoginSuccess({ id: data.user.id, email: data.user.email || email });
        }
      }
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'An error occurred during authentication.';
      if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('rate_limit')) {
        message = 'Email rate limit reached. Turn off "Confirm email" in Supabase Auth Settings or wait a few minutes.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    soundEngine.playButtonClickSound();
    setErrorMsg(null);
    setLoading(true);

    const getOrigin = () => {
      if (typeof window === 'undefined') return 'http://localhost:3000';
      return window.location.origin.replace('0.0.0.0', 'localhost');
    };

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${getOrigin()}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google OAuth sign in failed.';
      setErrorMsg(message);
      setLoading(false);
    }
  };

  const handleMagicLink = async (email: string) => {
    soundEngine.playButtonClickSound();
    if (!email || !isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    const getOrigin = () => {
      if (typeof window === 'undefined') return 'http://localhost:3000';
      return window.location.origin.replace('0.0.0.0', 'localhost');
    };

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${getOrigin()}` },
      });
      if (error) throw error;
      setSuccessMsg('Magic link sent to your email!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Magic link sending failed.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center bg-black overflow-hidden select-none">
      {/* 3D Sign In Card Component */}
      <SignInCard2
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onGoogleSignIn={handleGoogleLogin}
        onMagicLinkSignIn={handleMagicLink}
        isLoading={loading}
        errorMsg={errorMsg}
        successMsg={successMsg}
      />

      {/* Back to Home Button */}
      <div className="fixed bottom-6 left-6 sm:bottom-8 sm:left-8 z-30 pointer-events-auto">
        <LiquidGlass
          aberrationIntensity={1.5}
          blurAmount={0.06}
          borderRadius={999}
          displacementScale={30}
          elasticity={0.25}
          padding="12px"
          onClick={() => {
            soundEngine.playButtonClickSound();
            onGoBack();
          }}
          className="flex items-center justify-center text-zinc-200 hover:text-white cursor-pointer transition-all duration-300 border border-white/20 hover:border-white/50 shadow-2xl"
          title="Return to Landing"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-100" />
        </LiquidGlass>
      </div>
    </div>
  );
};
