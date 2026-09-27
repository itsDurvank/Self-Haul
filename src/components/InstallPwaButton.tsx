'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { LiquidGlass } from '@/components/ui/LiquidGlass';
import { soundEngine } from '@/lib/audio';

export const InstallPwaButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    soundEngine.playButtonClickSound();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  if (!isInstallable) return null;

  return (
    <LiquidGlass
      aberrationIntensity={1.5}
      blurAmount={0.06}
      borderRadius={100}
      displacementScale={30}
      elasticity={0.25}
      padding="6px 14px"
      onClick={handleInstallClick}
      className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-200 hover:text-white cursor-pointer transition-all border border-white/20 hover:border-white/50"
      title="Install Self-Haul as native app"
    >
      <Download className="w-3.5 h-3.5 text-zinc-300 animate-bounce" />
      <span>INSTALL APP</span>
    </LiquidGlass>
  );
};
