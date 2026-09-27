'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppStage, AppState, Question } from '@/types/selfhaul';
import { shuffle } from '@/lib/shuffle';
import { soundEngine } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import { saveQuestionToSupabase, saveAnswerToSupabase, saveUserProfileToSupabase, getUserProfileFromSupabase } from '@/lib/supabase/db';

const STORAGE_KEY = 'self_haul_ritual_draft_v1';

const initialState: AppState = {
  stage: 'landing',
  questions: [],
  queue: [],
  currentIndex: 0,
  soundOn: true,
  user: null,
};

export function useSelfHaul() {
  const [state, setState] = useState<AppState>(initialState);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load draft from localStorage & initialize Supabase Auth user session
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const handleUserSession = async (user: { id: string; email?: string }) => {
      if (!isMounted) return;

      // 1. Immediately set user and advance stage to 'dump' synchronously (0ms delay)
      setState((prev) => {
        const shouldAdvance = prev.stage === 'login' || prev.stage === 'landing' || prev.stage === 'onboarding';
        const nextStage = shouldAdvance ? 'dump' : prev.stage;

        const updatedUser = {
          id: user.id,
          email: user.email || '',
          fullName: prev.user?.fullName || user.email?.split('@')[0] || 'Seeker',
          moniker: prev.user?.moniker || user.email?.split('@')[0] || 'Seeker',
          intent: prev.user?.intent || 'Deep Self-Reflection',
        };

        return {
          ...prev,
          user: updatedUser,
          stage: nextStage,
        };
      });

      // 2. Fetch full profile asynchronously in background without delaying stage transition
      try {
        const profile = await getUserProfileFromSupabase(user.id);
        if (!isMounted || !profile) return;

        setState((prev) => {
          if (!prev.user) return prev;
          return {
            ...prev,
            user: {
              ...prev.user,
              fullName: profile.fullName || prev.user.fullName,
              moniker: profile.moniker || profile.fullName || prev.user.moniker,
              intent: profile.intent || prev.user.intent,
            },
          };
        });
      } catch (err) {
        console.warn('Failed to load user profile details:', err);
      }
    };

    const initialize = async () => {
      // 1. Load local draft state
      try {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.questions)) {
              setState((prev) => ({
                ...prev,
                ...parsed,
                stage: parsed.stage === 'portal' ? 'ready' : parsed.stage,
              }));
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load self-haul state from storage:', e);
      }

      // 2. Fetch active Supabase user session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.warn('Supabase getSession error:', error);
        if (session?.user && isMounted) {
          await handleUserSession(session.user);
        }
      } catch (err) {
        console.warn('getSession catch error:', err);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        handleUserSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        setState((prev) => ({ ...prev, user: null, stage: 'landing' }));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sync sound engine mute state
  useEffect(() => {
    soundEngine.setMuted(!state.soundOn);
  }, [state.soundOn]);

  // Sync to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save self-haul state to storage:', e);
    }
  }, [state, isHydrated]);

  // Handle unload warning when ritual is active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.questions.length > 0 && state.stage !== 'landing' && state.stage !== 'reflection') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.questions.length, state.stage]);

  const toggleSound = useCallback(() => {
    setState((prev) => {
      const nextSound = !prev.soundOn;
      soundEngine.setMuted(!nextSound);
      return { ...prev, soundOn: nextSound };
    });
  }, []);

  const setStage = useCallback((stage: AppStage) => {
    setState((prev) => ({ ...prev, stage }));
  }, []);

  const addQuestion = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const clientQId = crypto.randomUUID();
    const userId = state.user?.id || 'guest';

    const newQ: Question = {
      id: clientQId,
      text: trimmed,
      createdAt: Date.now(),
    };

    // 1. Immediately update UI state for 0ms latency
    setState((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ],
    }));

    // 2. Post question to /api/questions for server-authenticated Supabase insert
    let finalId = clientQId;
    try {
      const qRes = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: clientQId,
          rawText: trimmed,
          userId,
        }),
      });
      const qData = await qRes.json();
      if (qData.questionId) {
        finalId = qData.questionId;
        if (finalId !== clientQId) {
          setState((prev) => ({
            ...prev,
            questions: prev.questions.map((item) => (item.id === clientQId ? { ...item, id: finalId } : item)),
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to post question to server:', err);
    }

    // 3. Trigger background extraction & third-person RAG rephrasing
    fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: finalId,
        rawText: trimmed,
        userId,
      }),
    }).catch((err) => console.warn('Background extraction trigger warning:', err));

    fetch('/api/rephrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: finalId,
        rawText: trimmed,
        userId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.rephrasedText) {
          setState((prev) => ({
            ...prev,
            questions: prev.questions.map((item) =>
              item.id === finalId ? { ...item, rephrasedText: data.rephrasedText } : item
            ),
          }));
        }
      })
      .catch((err) => console.warn('Background rephrasing trigger warning:', err));
  }, [state.user]);

  const removeQuestion = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  }, []);

  const startPortal = useCallback(() => {
    if (state.questions.length === 0) return;

    // Fisher-Yates shuffle the question IDs
    const shuffledIds = shuffle(state.questions.map((q) => q.id));

    // INSTANTLY transition stage to 'portal' so portal video plays immediately with ZERO latency
    setState((prev) => ({
      ...prev,
      stage: 'portal',
      queue: shuffledIds,
      currentIndex: 0,
    }));

    // Trigger rephrasing asynchronously in background while portal video plays
    const userId = state.user?.id || 'guest';
    const unrephrased = state.questions.filter((q) => !q.rephrasedText);

    if (unrephrased.length > 0) {
      unrephrased.forEach((q) => {
        fetch('/api/rephrase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: q.id,
            rawText: q.text,
            userId,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.rephrasedText) {
              setState((prev) => ({
                ...prev,
                questions: prev.questions.map((item) =>
                  item.id === q.id ? { ...item, rephrasedText: data.rephrasedText } : item
                ),
              }));
            }
          })
          .catch((err) => console.warn('Rephrasing fetch warning:', err));
      });
    }
  }, [state.questions, state.user]);

  const requestAIInsight = useCallback(async (): Promise<string | null> => {
    if (!state.user) return null;
    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.user.id,
          questionIds: state.questions.map((q) => q.id),
        }),
      });
      const data = await res.json();
      return data.insightText || null;
    } catch (err) {
      console.warn('Failed to fetch AI insight:', err);
      return null;
    }
  }, [state.user, state.questions]);

  const answerCurrentQuestion = useCallback((answerText: string) => {
    setState((prev) => {
      const currentQId = prev.queue[prev.currentIndex];
      if (!currentQId) return prev;

      if (prev.user) {
        saveAnswerToSupabase(prev.user.id, currentQId, answerText);
      }

      const updatedQuestions = prev.questions.map((q) => {
        if (q.id === currentQId) {
          return {
            ...q,
            answer: answerText,
            answeredAt: Date.now(),
            skipped: false,
          };
        }
        return q;
      });

      const nextIndex = prev.currentIndex + 1;
      const isFinished = nextIndex >= prev.queue.length;

      return {
        ...prev,
        questions: updatedQuestions,
        currentIndex: nextIndex,
        stage: isFinished ? 'reflection' : 'answer',
      };
    });
  }, []);

  const skipCurrentQuestion = useCallback(() => {
    setState((prev) => {
      const currentQId = prev.queue[prev.currentIndex];
      if (!currentQId) return prev;

      const updatedQuestions = prev.questions.map((q) => {
        if (q.id === currentQId) {
          return {
            ...q,
            skipped: true,
          };
        }
        return q;
      });

      const nextIndex = prev.currentIndex + 1;
      const isFinished = nextIndex >= prev.queue.length;

      return {
        ...prev,
        questions: updatedQuestions,
        currentIndex: nextIndex,
        stage: isFinished ? 'reflection' : 'answer',
      };
    });
  }, []);

  const burnAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState((prev) => ({
      ...initialState,
      soundOn: prev.soundOn,
      user: prev.user,
      stage: prev.user ? 'dump' : 'landing',
    }));
  }, []);

  const getCurrentQuestion = useCallback((): Question | null => {
    const currentQId = state.queue[state.currentIndex];
    if (!currentQId) return null;
    return state.questions.find((q) => q.id === currentQId) || null;
  }, [state.queue, state.currentIndex, state.questions]);

  const setUser = useCallback((user: { id: string; email: string; fullName?: string; moniker?: string; intent?: string } | null) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  const saveProfile = useCallback(async (profileData: { fullName: string; moniker: string; intent: string }) => {
    setState((prev) => {
      if (prev.user) {
        saveUserProfileToSupabase(prev.user.id, profileData);
      }
      return {
        ...prev,
        stage: 'dump',
        user: prev.user ? {
          ...prev.user,
          fullName: profileData.fullName,
          moniker: profileData.moniker,
          intent: profileData.intent,
        } : null,
      };
    });
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setState((prev) => ({
      ...prev,
      user: null,
      stage: 'landing',
    }));
  }, []);

  return {
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
  };
}
