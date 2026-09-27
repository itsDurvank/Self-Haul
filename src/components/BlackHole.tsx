'use client';

import React from 'react';
import { motion } from 'motion/react';

interface BlackHoleProps {
  isAbsorbing?: boolean;
  pulseTrigger?: number;
  size?: number;
}

export const BlackHole: React.FC<BlackHoleProps> = ({
  isAbsorbing = false,
}) => {
  return (
    <div className="relative flex items-center justify-center select-none pointer-events-none">
      {/* User's Animated Black Hole GIF Container - Increased Size & Zero Artificial Glows */}
      <motion.div
        animate={{
          scale: isAbsorbing ? [1, 1.06, 0.98, 1] : [1, 1.02, 1],
        }}
        transition={{
          scale: {
            duration: isAbsorbing ? 0.75 : 4,
            repeat: isAbsorbing ? 0 : Infinity,
            ease: 'easeInOut',
          },
        }}
        style={{
          WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.9) 65%, rgba(0,0,0,0) 80%)',
          maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.9) 65%, rgba(0,0,0,0) 80%)',
        }}
        className="relative flex items-center justify-center w-[380px] h-[380px] sm:w-[540px] sm:h-[540px] md:w-[620px] md:h-[620px]"
      >
        {/* eslint-disable-next-html-element-for-img */}
        <img
          src="/media/images/blackhole-animation.gif"
          alt="Black Hole Animation"
          className="w-full h-full object-contain scale-110"
        />
      </motion.div>
    </div>
  );
};
