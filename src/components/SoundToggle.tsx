'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface SoundToggleProps {
  soundOn: boolean;
  onToggle: () => void;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({ soundOn, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="fixed top-6 right-6 z-50 p-2.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 text-zinc-400 hover:text-cyan-400 transition-all backdrop-blur-md focus:outline-none"
      title={soundOn ? 'Mute Sound' : 'Enable Sound'}
      aria-label="Toggle Sound"
    >
      {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
    </button>
  );
};
