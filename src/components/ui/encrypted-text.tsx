'use client';

import React, { useEffect, useState } from 'react';

interface EncryptedTextProps {
  text: string;
  className?: string;
  interval?: number;
}

const CIPHER_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?#$';

export const EncryptedText: React.FC<EncryptedTextProps> = ({
  text,
  className = '',
  interval = 30,
}) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    let iteration = 0;
    const totalChars = text.length;

    const timer = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((char, index) => {
            if (index < iteration) {
              return text[index];
            }
            if (char === ' ' || char === '"' || char === '“' || char === '”') return char;
            return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
          })
          .join('')
      );

      if (iteration >= totalChars) {
        clearInterval(timer);
      }

      iteration += 1;
    }, interval);

    return () => clearInterval(timer);
  }, [text, interval]);

  return (
    <span className={`inline font-mono font-medium tracking-wide transition-colors ${className}`}>
      {displayText}
    </span>
  );
};
