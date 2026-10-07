
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '@/types/selfhaul';
import { formatAsText, formatAsMarkdown, downloadFile } from '@/lib/export';
import { soundEngine } from '@/lib/audio';
import { Download, Copy, Flame, RotateCcw, Check, FileText, Sparkles, ArrowLeft, ChevronDown, ChevronUp, Send, MessageSquare, History } from 'lucide-react';
import { LiquidGlass } from '@/components/ui/LiquidGlass';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SavedSessionEntry {
  id: string;
  question: string;
  rephrasedText: string | null;
  answer: string | null;
  skipped: boolean;
  createdAt: string;
}

interface SavedSessionGroup {
  sessionId: string;
  dateLabel: string;
  dateIso: string;
  timestamp: number;
  entryCount: number;
  entries: SavedSessionEntry[];
}

interface ReflectionProps {
  questions: Question[];
  onBurnAll: () => void;
  onRestart: () => void;
  onRequestAIInsight?: () => Promise<string | null>;
}

export const Reflection: React.FC<ReflectionProps> = ({ questions, onBurnAll, onRestart, onRequestAIInsight }) => {
  const [copied, setCopied] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightResult, setInsightResult] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);

  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsList, setSessionsList] = useState<SavedSessionGroup[]>([]);
  const [sessionsExpandedMap, setSessionsExpandedMap] = useState<Record<string, boolean>>({});

  const handleOpenSessions = async () => {
    soundEngine.playButtonClickSound();
    setSessionsModalOpen(true);
    setSessionsLoading(true);
    try {
      if (questions.length > 0) {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: questions.map((q) => ({
              id: q.id,
              text: q.text,
              rephrasedText: q.rephrasedText,
              answer: q.answer || (q.skipped ? '[Skipped]' : null),
            })),
          }),
        }).catch(() => {});
      }

      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessionsList(data.sessions || []);
      }
    } catch (err) {
      console.warn('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const toggleSessionEntryExpand = (entryId: string) => {
    soundEngine.playButtonClickSound();
    setSessionsExpandedMap((prev) => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleRequestInsight = async () => {
    soundEngine.playButtonClickSound();
    setInsightModalOpen(true);
    if (insightResult) return; // Already fetched for this session
    setInsightLoading(true);
    try {
      if (onRequestAIInsight) {
        const text = await onRequestAIInsight();
        setInsightResult(text || 'No pattern gap identified in this session.');
      } else {
        setInsightResult('AI Insight service unavailable.');
      }
    } catch (e) {
      setInsightResult('Unable to generate AI Insight.');
    } finally {
      setInsightLoading(false);
    }
  };

  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = (presetText || chatInput).trim();
    if (!textToSend || isSendingChat) return;

    soundEngine.playEnterKeySound();
    setChatInput('');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend,
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setIsSendingChat(true);
    scrollToBottom();

    try {
      const questionIds = questions.map((q) => q.id).filter(Boolean);
      const res = await fetch('/api/insight/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          questionIds,
          initialInsight: insightResult,
        }),
      });

      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();

      if (data.reply) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.reply,
          },
        ]);
        soundEngine.playAstralChime();
        scrollToBottom();
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Unable to reach the Socratic Inquirer right now. Please try again in a moment.',
        },
      ]);
    } finally {
      setIsSendingChat(false);
      scrollToBottom();
    }
  };

  const toggleExpand = (id: string) => {
    soundEngine.playButtonClickSound();
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = () => {
    soundEngine.playButtonClickSound();
    const text = formatAsText(questions);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    soundEngine.playButtonClickSound();
    const text = formatAsText(questions);
    downloadFile(`self-haul-reflection-${Date.now()}.txt`, text, 'text/plain');
  };

  const handleDownloadMd = () => {
    soundEngine.playButtonClickSound();
    const md = formatAsMarkdown(questions);
    downloadFile(`self-haul-reflection-${Date.now()}.md`, md, 'text/markdown');
  };

  const handleBurn = () => {
    setIsBurning(true);
    soundEngine.playButtonClickSound();

    setTimeout(() => {
      onBurnAll();
    }, 1800);
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between p-4 sm:p-10 bg-[#030306] text-zinc-100 overflow-x-hidden select-none">
      {/* Full Screen Background Image (result.png) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/media/images/result.png"
          alt="Background Statue"
          className="w-full h-full object-cover object-center filter contrast-110 brightness-[0.6] opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030306]/60 via-transparent to-[#030306]/85" />
      </div>

      {/* Burn Animation Overlay */}
      <AnimatePresence>
        {isBurning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.5, 0], rotate: [0, 180, 360], opacity: [1, 0.8, 0] }}
              transition={{ duration: 1.6 }}
              className="w-40 h-40 rounded-full bg-gradient-to-t from-red-600 via-orange-500 to-amber-300 blur-md shadow-[0_0_80px_rgba(239,68,68,0.8)]"
            />
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5 }}
              className="text-2xl font-serif tracking-[0.3em] uppercase text-amber-200 mt-6"
            >
              Ashes to the Void
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Main Title & Subtitle */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center z-10 pt-8 sm:pt-4 space-y-3">
        <h1 className="text-2xl sm:text-4xl md:text-5xl tracking-[0.12em] sm:tracking-[0.2em] font-serif font-light text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-300 uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] whitespace-nowrap">
          Reflection & Answers
        </h1>
        <p className="text-xs text-zinc-300 font-mono tracking-wider drop-shadow-md">
          Your thoughts have surfaced. Keep them, export them, or burn them away.
        </p>
      </div>

      {/* Q&A List Cards wrapped in Apple Vision LiquidGlass Sheets */}
      <div className="w-full max-w-2xl my-4 sm:my-5 space-y-4 z-10 max-h-[66dvh] sm:max-h-[70dvh] overflow-y-auto px-2 custom-scrollbar">
        {questions.map((q, idx) => {
          const isExpanded = !!expandedMap[q.id];

          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <LiquidGlass
                aberrationIntensity={1.5}
                blurAmount={0.04}
                borderRadius={20}
                displacementScale={30}
                elasticity={0.2}
                padding="20px 24px"
                saturation={120}
                glowOnHoverOnly={true}
                onClick={() => toggleExpand(q.id)}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), 0 10px 30px rgba(0, 0, 0, 0.3)',
                }}
                className="w-full border border-white/25 hover:border-white/45 transition-all duration-300 cursor-pointer"
              >
                <div className="w-full flex flex-col space-y-3 text-left">
                  {/* Card Header: Question Number & Expand Toggle */}
                  <div className="flex items-center justify-between gap-4 pb-0.5 border-b border-white/10 pb-2">
                    <span className="text-xs font-mono font-semibold text-cyan-300 uppercase tracking-[0.2em]">
                      ENTRY {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-zinc-400">
                        {isExpanded ? 'Collapse' : 'Tap to expand'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-cyan-300" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* 1. Original Question */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-semibold block">
                      ORIGINAL DOUBT
                    </span>
                    <div className={`text-sm sm:text-base font-sans text-zinc-200 font-normal leading-relaxed ${!isExpanded ? 'line-clamp-1' : ''}`}>
                      "{q.text}"
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3 pt-2 border-t border-white/10 overflow-hidden"
                      >
                        {/* 2. Rephrased Narration */}
                        {q.rephrasedText && (
                          <div className="space-y-1 bg-white/[0.03] p-3 rounded-xl border border-white/10">
                            <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest font-semibold block">
                              THIRD-PERSON NARRATION
                            </span>
                            <p className="text-sm font-serif italic text-zinc-200 leading-relaxed">
                              {q.rephrasedText}
                            </p>
                          </div>
                        )}

                        {/* 3. Your Response / Answer */}
                        <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold block">
                            YOUR RESPONSE
                          </span>
                          {q.skipped ? (
                            <p className="text-sm font-sans italic text-zinc-400">[Skipped]</p>
                          ) : q.answer ? (
                            <p className="text-sm sm:text-base font-sans text-zinc-100 leading-relaxed whitespace-pre-wrap">
                              {q.answer}
                            </p>
                          ) : (
                            <p className="text-sm font-sans italic text-zinc-400">[No response provided]</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </LiquidGlass>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Apple UI Glass Dock Action Bar */}
      <div className="z-20 pb-2 pt-1 w-full flex justify-center">
        <div className="flex items-center gap-2 sm:gap-3 p-2 rounded-full bg-black/40 backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.3)] flex-nowrap overflow-x-auto max-w-[95vw] custom-scrollbar px-3">
          {/* AI Insight On-Demand Button */}
          <LiquidGlass
            aberrationIntensity={1.8}
            blurAmount={0.08}
            borderRadius={100}
            displacementScale={30}
            elasticity={0.2}
            padding="9px 22px"
            glowOnHoverOnly={true}
            onClick={handleRequestInsight}
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(0, 180, 255, 0.4) 0%, rgba(2, 45, 90, 0.85) 100%)',
              boxShadow: 'inset 0 1px 1px rgba(125, 211, 252, 0.5), 0 0 18px rgba(0, 180, 255, 0.4)',
            }}
            className="text-xs font-mono font-semibold tracking-[0.15em] text-cyan-100 border border-cyan-400/50 hover:border-cyan-300 cursor-pointer whitespace-nowrap shrink-0 shadow-md"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse shrink-0" />
              <span className="whitespace-nowrap">AI Insight</span>
            </div>
          </LiquidGlass>

          <LiquidGlass
            aberrationIntensity={1.5}
            blurAmount={0.08}
            borderRadius={100}
            displacementScale={30}
            elasticity={0.25}
            padding="9px 20px"
            glowOnHoverOnly={true}
            onClick={handleOpenSessions}
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(35, 40, 52, 0.75) 0%, rgba(12, 14, 20, 0.85) 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
            className="text-xs font-mono font-semibold text-zinc-200 hover:text-white cursor-pointer transition-all border border-white/20 hover:border-white/50 whitespace-nowrap shrink-0 shadow-md"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <History className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span className="whitespace-nowrap">Sessions</span>
            </div>
          </LiquidGlass>

          <LiquidGlass
            aberrationIntensity={1.5}
            blurAmount={0.08}
            borderRadius={100}
            displacementScale={30}
            elasticity={0.25}
            padding="9px 20px"
            glowOnHoverOnly={true}
            onClick={handleDownloadTxt}
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(35, 40, 52, 0.75) 0%, rgba(12, 14, 20, 0.85) 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
            className="text-xs font-mono font-semibold text-zinc-200 hover:text-white cursor-pointer transition-all border border-white/20 hover:border-white/50 whitespace-nowrap shrink-0 shadow-md"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <Download className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="whitespace-nowrap">Download .TXT</span>
            </div>
          </LiquidGlass>

          <LiquidGlass
            aberrationIntensity={1.5}
            blurAmount={0.08}
            borderRadius={100}
            displacementScale={30}
            elasticity={0.25}
            padding="9px 20px"
            glowOnHoverOnly={true}
            onClick={handleDownloadMd}
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(35, 40, 52, 0.75) 0%, rgba(12, 14, 20, 0.85) 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
            className="text-xs font-mono font-semibold text-zinc-200 hover:text-white cursor-pointer transition-all border border-white/20 hover:border-white/50 whitespace-nowrap shrink-0 shadow-md"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <FileText className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="whitespace-nowrap">Download .MD</span>
            </div>
          </LiquidGlass>

          <LiquidGlass
            aberrationIntensity={1.5}
            blurAmount={0.08}
            borderRadius={100}
            displacementScale={30}
            elasticity={0.25}
            padding="9px 20px"
            glowOnHoverOnly={true}
            onClick={() => {
              soundEngine.playButtonClickSound();
              onRestart();
            }}
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(35, 40, 52, 0.75) 0%, rgba(12, 14, 20, 0.85) 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
            className="text-xs font-mono font-semibold text-zinc-200 hover:text-white cursor-pointer transition-all border border-white/20 hover:border-white/50 whitespace-nowrap shrink-0 shadow-md"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <RotateCcw className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="whitespace-nowrap">New Ritual</span>
            </div>
          </LiquidGlass>

          <LiquidGlass
            aberrationIntensity={1.8}
            blurAmount={0.08}
            borderRadius={100}
            displacementScale={30}
            elasticity={0.2}
            padding="9px 24px"
            glowOnHoverOnly={true}
            onClick={handleBurn}
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(160, 0, 0, 0.85) 0%, rgba(45, 0, 0, 0.92) 100%)',
              boxShadow: 'inset 0 1px 1px rgba(248, 113, 113, 0.4), 0 0 18px rgba(160, 0, 0, 0.65)',
            }}
            className="text-xs font-mono font-semibold tracking-[0.2em] text-red-100 border border-red-600/80 hover:border-red-400 cursor-pointer whitespace-nowrap shrink-0 shadow-md"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <Flame className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />
              <span className="whitespace-nowrap">Burn It All</span>
            </div>
          </LiquidGlass>
        </div>
      </div>

      {/* Bottom-Left Apple UI Glass Back Button */}
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
          blurAmount={0.08}
          borderRadius={999}
          displacementScale={30}
          elasticity={0.25}
          padding="12px"
          onClick={() => {
            soundEngine.playButtonClickSound();
            onRestart();
          }}
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(35, 40, 52, 0.75) 0%, rgba(12, 14, 20, 0.85) 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
          className="flex items-center justify-center text-zinc-200 hover:text-white cursor-pointer transition-all duration-300 focus:outline-none border border-white/25 hover:border-white/50 shadow-2xl"
          title="Return to Home"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-100" />
        </LiquidGlass>
      </motion.div>

      {/* AI Insight On-Demand Modal Overlay & Socratic Dialogue */}
      <AnimatePresence>
        {insightModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6"
            onClick={() => setInsightModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl max-h-[90dvh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <LiquidGlass
                aberrationIntensity={1.8}
                blurAmount={0.1}
                borderRadius={28}
                displacementScale={35}
                elasticity={0.2}
                padding="24px 24px"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.3), 0 35px 90px rgba(0, 0, 0, 0.95)',
                }}
                className="w-full border border-cyan-500/30 shadow-2xl relative flex flex-col max-h-[90dvh]"
              >
                <div className="flex flex-col h-full space-y-4 text-left overflow-hidden">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-white/15 pb-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-zinc-200 font-mono bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                      <span>AI INSIGHT & SOCRATIC MIRROR</span>
                    </div>
                    <button
                      onClick={() => setInsightModalOpen(false)}
                      className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
                    >
                      Close ✕
                    </button>
                  </div>

                  {insightLoading ? (
                    <div className="py-16 flex flex-col items-center justify-center space-y-4">
                      <div className="w-9 h-9 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span className="text-xs font-mono text-zinc-100 tracking-wider animate-pulse">
                        Analyzing longitudinal vector patterns & gap dynamics...
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Scrollable Chat & Diagnosis Area */}
                      <div
                        ref={chatScrollRef}
                        className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar max-h-[58dvh] sm:max-h-[62dvh]"
                      >
                        {/* Initial Diagnostic Insight Box */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-black/45 border border-cyan-500/25 shadow-inner space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-cyan-300 uppercase font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            <span>SESSION DIAGNOSTIC GAP ANALYSIS</span>
                          </div>
                          <div className="text-sm sm:text-base font-sans text-zinc-100 leading-relaxed whitespace-pre-wrap">
                            {insightResult}
                          </div>
                        </div>

                        {/* Message Stream */}
                        <div className="space-y-3 pt-1">
                          {chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                            >
                              <div className="text-[10px] font-mono text-zinc-400 mb-1 px-1">
                                {msg.role === 'user' ? 'YOU' : 'SOCRATIC INQUIRER'}
                              </div>
                              <div
                                className={`p-3.5 sm:p-4 rounded-2xl max-w-[88%] text-sm font-sans leading-relaxed ${
                                  msg.role === 'user'
                                    ? 'bg-zinc-800/90 text-white border border-white/20 shadow-md'
                                    : 'bg-black/60 text-zinc-100 border-l-2 border-l-cyan-400 border border-white/10 shadow-lg whitespace-pre-wrap'
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))}

                          {isSendingChat && (
                            <div className="flex flex-col items-start space-y-1">
                              <span className="text-[10px] font-mono text-zinc-400 px-1">SOCRATIC INQUIRER</span>
                              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                                <span className="text-xs font-mono text-zinc-300 animate-pulse">
                                  Consulting vector memory & synthesizing...
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Chat Input Bar */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendChatMessage();
                        }}
                        className="pt-2 border-t border-white/10 shrink-0 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Reply, challenge, or ask the Socratic mirror..."
                          disabled={isSendingChat}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-cyan-400/60 text-white placeholder-zinc-400 text-sm font-sans focus:outline-none transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim() || isSendingChat}
                          className="p-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-200 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shrink-0"
                          title="Send message"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </>
                  )}

                  <div className="text-[10px] font-mono text-zinc-400 text-center shrink-0">
                    Context calibrated across your longitudinal vector memory
                  </div>
                </div>
              </LiquidGlass>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previous Sessions Modal Overlay */}
      <AnimatePresence>
        {sessionsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6"
            onClick={() => setSessionsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-2xl max-h-[88dvh] bg-[#0c0e16]/95 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.25)] flex flex-col overflow-hidden p-5 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-mono font-bold tracking-wider text-white uppercase">
                      Previous Ritual Sessions
                    </h2>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Longitudinal reflection archives saved per user isolation
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSessionsModalOpen(false)}
                  className="px-2.5 py-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-mono border border-white/10"
                >
                  Close ✕
                </button>
              </div>

              {/* Content: Sessions grouped by date */}
              <div className="flex-1 overflow-y-auto space-y-6 my-4 pr-1.5 custom-scrollbar min-h-0">
                {sessionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono text-cyan-300 tracking-wider">
                      Retrieving authenticated user records...
                    </span>
                  </div>
                ) : sessionsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-2 text-center">
                    <History className="w-9 h-9 text-zinc-500 mb-2" />
                    <p className="text-sm font-mono text-zinc-300">No previous sessions found</p>
                    <p className="text-xs font-mono text-zinc-400">
                      Complete your doubts and reflections to archive them here.
                    </p>
                  </div>
                ) : (
                  sessionsList.map((session, sIdx) => (
                    <div key={session.sessionId || sIdx} className="space-y-3">
                      {/* Session Date Badge Header */}
                      <div className="sticky top-0 z-20 flex items-center justify-between py-1.5 px-3 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          <span className="text-xs font-mono font-semibold text-cyan-200 tracking-wider">
                            {session.dateLabel}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {session.entries.length} {session.entries.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>

                      {/* List of Entries for this session with the exact same UI as the reviewing section */}
                      <div className="space-y-3">
                        {session.entries.map((entry, idx) => {
                          const isExpanded = !!sessionsExpandedMap[entry.id];

                          return (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.04 }}
                            >
                              <LiquidGlass
                                aberrationIntensity={1.5}
                                blurAmount={0.04}
                                borderRadius={20}
                                displacementScale={30}
                                elasticity={0.2}
                                padding="18px 22px"
                                saturation={120}
                                glowOnHoverOnly={true}
                                onClick={() => toggleSessionEntryExpand(entry.id)}
                                style={{
                                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                  boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), 0 10px 30px rgba(0, 0, 0, 0.3)',
                                }}
                                className="w-full border border-white/25 hover:border-white/45 transition-all duration-300 cursor-pointer"
                              >
                                <div className="w-full flex flex-col space-y-3 text-left">
                                  {/* Card Header: Entry Number & Expand Toggle */}
                                  <div className="flex items-center justify-between gap-4 pb-0.5 border-b border-white/10 pb-2">
                                    <span className="text-xs font-mono font-semibold text-cyan-300 uppercase tracking-[0.2em]">
                                      ENTRY {idx + 1}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono text-zinc-400">
                                        {isExpanded ? 'Collapse' : 'Tap to expand'}
                                      </span>
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-cyan-300" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                                      )}
                                    </div>
                                  </div>

                                  {/* 1. Original Question */}
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-semibold block">
                                      ORIGINAL DOUBT
                                    </span>
                                    <div className={`text-sm sm:text-base font-sans text-zinc-200 font-normal leading-relaxed ${!isExpanded ? 'line-clamp-1' : ''}`}>
                                      "{entry.question}"
                                    </div>
                                  </div>

                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-3 pt-2 border-t border-white/10 overflow-hidden"
                                      >
                                        {/* 2. Rephrased Narration */}
                                        {entry.rephrasedText && (
                                          <div className="space-y-1 bg-white/[0.03] p-3 rounded-xl border border-white/10">
                                            <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest font-semibold block">
                                              THIRD-PERSON NARRATION
                                            </span>
                                            <p className="text-sm font-serif italic text-zinc-200 leading-relaxed">
                                              {entry.rephrasedText}
                                            </p>
                                          </div>
                                        )}

                                        {/* 3. Your Response / Answer */}
                                        <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold block">
                                            YOUR RESPONSE
                                          </span>
                                          {entry.skipped ? (
                                            <p className="text-sm font-sans italic text-zinc-400">[Skipped]</p>
                                          ) : entry.answer ? (
                                            <p className="text-sm sm:text-base font-sans text-zinc-100 leading-relaxed whitespace-pre-wrap">
                                              {entry.answer}
                                            </p>
                                          ) : (
                                            <p className="text-sm font-sans italic text-zinc-400">[No response provided]</p>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </LiquidGlass>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-white/10 text-[10px] font-mono text-zinc-400 text-center shrink-0">
                User isolated session logs stored securely in Supabase
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

