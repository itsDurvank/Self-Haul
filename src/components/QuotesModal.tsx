'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FAMOUS_QUOTES, Quote } from '@/data/quotes';
import { X, Search, Sparkles, BookOpen, Quote as QuoteIcon, Check } from 'lucide-react';

interface QuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuote: (quoteText: string) => void;
}

export const QuotesModal: React.FC<QuotesModalProps> = ({
  isOpen,
  onClose,
  onSelectQuote,
}) => {
  const [filter, setFilter] = useState<'all' | 'ancient' | 'leader'>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredQuotes = FAMOUS_QUOTES.filter((q) => {
    const matchesFilter = filter === 'all' || q.category === filter;
    const matchesSearch =
      q.text.toLowerCase().includes(search.toLowerCase()) ||
      q.author.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handlePick = (q: Quote) => {
    const formatted = `"${q.text}" - ${q.author}`;
    onSelectQuote(formatted);
    setCopiedId(q.id);
    setTimeout(() => {
      setCopiedId(null);
      onClose();
    }, 350);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-[#0a0b16] border border-orange-500/30 text-zinc-100 shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-[#0c0e1e]/90">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-light text-amber-100 tracking-wide">
                    50 Famous Quotes
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    Ancient Philosophers & Global Leaders
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 sm:p-6 space-y-4 border-b border-zinc-800/50 bg-[#080914]">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by philosopher, leader or text..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-700/60 text-xs font-mono text-amber-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/60"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800 shrink-0">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      filter === 'all'
                        ? 'bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/40'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All (50)
                  </button>
                  <button
                    onClick={() => setFilter('ancient')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      filter === 'ancient'
                        ? 'bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/40'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Ancient (25)
                  </button>
                  <button
                    onClick={() => setFilter('leader')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      filter === 'leader'
                        ? 'bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/40'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Leaders (25)
                  </button>
                </div>
              </div>
            </div>

            {/* Quotes List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
              {filteredQuotes.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-500">
                  No quotes found matching your search.
                </div>
              ) : (
                filteredQuotes.map((q) => {
                  const isPicked = copiedId === q.id;
                  return (
                    <div
                      key={q.id}
                      onClick={() => handlePick(q)}
                      className={`group relative p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                        isPicked
                          ? 'bg-orange-500/20 border-orange-400 text-orange-200'
                          : 'bg-[#0e0f22]/70 hover:bg-[#151733] border-zinc-800/80 hover:border-orange-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <p className="text-sm font-serif text-zinc-100 group-hover:text-amber-100 leading-relaxed">
                            "{q.text}"
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-medium text-orange-400">
                              — {q.author}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 uppercase tracking-wider">
                              {q.category === 'ancient' ? 'Ancient Philosopher' : 'Global Leader'}
                            </span>
                          </div>
                        </div>

                        <button className="p-2 rounded-xl bg-zinc-800/50 group-hover:bg-orange-500/20 group-hover:text-orange-300 text-zinc-400 transition-colors shrink-0">
                          {isPicked ? (
                            <Check className="w-4 h-4 text-orange-300" />
                          ) : (
                            <QuoteIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-800/80 bg-[#080914] flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-orange-400">
                <Sparkles className="w-3.5 h-3.5" />
                Click any quote to dump into the void
              </span>
              <span>Showing {filteredQuotes.length} quotes</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
