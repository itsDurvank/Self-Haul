'use client';

import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle } from 'lucide-react';

interface PromptStartersProps {
  onSelectPrompt: (text: string) => void;
}

const PROMPTS = [
  'What am I avoiding?',
  'What truth am I pretending not to notice?',
  'What choice am I delaying out of fear?',
  'What would I do if nobody was watching?',
  'What standard am I holding myself to that isn’t mine?',
];

export const PromptStarters: React.FC<PromptStartersProps> = ({ onSelectPrompt }) => {
  return (
    <div className="flex flex-col items-center space-y-3 w-full max-w-4xl px-2">
      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-widest text-orange-400 drop-shadow-[0_0_8px_rgba(255,85,0,0.3)]">
        <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
        <span>PROMPT STARTERS</span>
      </div>

      <div className="flex flex-nowrap items-center gap-3 overflow-x-auto w-full max-w-full pb-2 pt-1 px-4 justify-start sm:justify-center custom-scrollbar">
        {PROMPTS.map((prompt, idx) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelectPrompt(prompt)}
            className="whitespace-nowrap shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-sans font-normal text-zinc-200 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-orange-500/60 hover:text-white hover:shadow-[0_0_15px_rgba(255,85,0,0.2)] transition-all shadow-lg backdrop-blur-md tracking-wide"
          >
            &ldquo;{prompt}&rdquo;
          </motion.button>
        ))}
      </div>
    </div>
  );
};
