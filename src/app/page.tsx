'use client';

import React from 'react';
import { useSelfHaul } from '@/hooks/useSelfHaul';
import { Landing } from '@/components/Landing';
import { LoginScreen } from '@/components/LoginScreen';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { DumpScreen } from '@/components/DumpScreen';
import { ReadyGate } from '@/components/ReadyGate';
import { Portal } from '@/components/Portal';
import { AnswerScreen } from '@/components/AnswerScreen';
import { Reflection } from '@/components/Reflection';
import { SoundToggle } from '@/components/SoundToggle';

export default function Home() {
  const {
    state,
    isHydrated,
    setStage,
    setUser,
    saveProfile,
    signOut,
    addQuestion,
    removeQuestion,
    startPortal,
    answerCurrentQuestion,
    skipCurrentQuestion,
    burnAll,
    toggleSound,
    getCurrentQuestion,
    requestAIInsight,
  } = useSelfHaul();

  if (!isHydrated) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#030306] relative overflow-hidden flex flex-col items-center justify-center select-none">
        <div className="absolute inset-0 bg-black pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/[0.03] blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-white/20 border-t-white animate-spin backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
          <span className="text-xs font-sans tracking-widest text-zinc-400 uppercase">Self-Haul</span>
        </div>
      </div>
    );
  }

  const handleLandingEnter = () => {
    if (state.user) {
      setStage('dump');
    } else {
      setStage('login');
    }
  };

  const renderStage = () => {
    switch (state.stage) {
      case 'landing':
        return <Landing onEnter={handleLandingEnter} />;

      case 'login':
        return (
          <LoginScreen
            onLoginSuccess={(user) => {
              setUser(user);
              setStage('dump');
            }}
            onGoBack={() => setStage('landing')}
          />
        );

      case 'dump':
        return (
          <DumpScreen
            questionCount={state.questions.length}
            onAddQuestion={addQuestion}
            onProceedToReady={() => setStage('ready')}
            onGoHome={() => setStage('landing')}
            userEmail={state.user?.email}
            userName={state.user?.moniker || state.user?.fullName}
            onSignOut={signOut}
          />
        );

      case 'ready':
        return (
          <ReadyGate
            questions={state.questions}
            onStartPortal={startPortal}
            onBackToDump={() => setStage('dump')}
            onRemoveQuestion={removeQuestion}
          />
        );

      case 'portal':
        return <Portal questions={state.questions} onComplete={() => setStage('answer')} />;

      case 'answer':
        return (
          <AnswerScreen
            currentQuestion={getCurrentQuestion()}
            currentIndex={state.currentIndex}
            totalQuestions={state.queue.length}
            onAnswerSubmit={answerCurrentQuestion}
            onSkipQuestion={skipCurrentQuestion}
          />
        );

      case 'reflection':
        return (
          <Reflection
            questions={state.questions}
            onBurnAll={burnAll}
            onRestart={() => setStage('dump')}
            onRequestAIInsight={requestAIInsight}
          />
        );

      default:
        return <Landing onEnter={handleLandingEnter} />;
    }
  };

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#030306] overflow-hidden">
      <SoundToggle soundOn={state.soundOn} onToggle={toggleSound} />
      {renderStage()}
    </main>
  );
}
