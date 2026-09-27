"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FAMOUS_QUOTES } from "@/data/quotes";

const FLAP_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$()-+&=;:'\"%,./?°";

const BOARD_ROWS = 6;
const BOARD_COLS = 22;

const BASE_COL_DELAY = 30;
const BASE_ROW_DELAY = 20;
const BASE_STEP_MS = 55;
const BASE_FLIP_S = 0.35;
const BASE_TOTAL_S =
  ((BOARD_COLS - 1) * BASE_COL_DELAY +
    (BOARD_ROWS - 1) * BASE_ROW_DELAY +
    8 * BASE_STEP_MS) /
  1000;

export type AccentColor = {
  top: string;
  bottom: string;
  text: string;
};

export const ACCENT_COLORS: AccentColor[] = [
  { top: "bg-red-600", bottom: "bg-red-700", text: "text-white" },
  { top: "bg-orange-500", bottom: "bg-orange-600", text: "text-white" },
  { top: "bg-yellow-400", bottom: "bg-yellow-500", text: "text-neutral-950" },
  { top: "bg-emerald-600", bottom: "bg-emerald-700", text: "text-white" },
  { top: "bg-blue-600", bottom: "bg-blue-700", text: "text-white" },
  { top: "bg-purple-600", bottom: "bg-purple-700", text: "text-white" },
  { top: "bg-white", bottom: "bg-neutral-200", text: "text-neutral-950" },
  { top: "bg-yellow-400", bottom: "bg-blue-600", text: "text-neutral-950" },
  { top: "bg-blue-600", bottom: "bg-yellow-400", text: "text-white" },
];

const CELL_TEXT_STYLE: React.CSSProperties = {
  fontSize: "clamp(9px, 2vw, 22px)",
  lineHeight: 1,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontWeight: 800,
};

// ── Individual Split-Flap Character ───────────────────────────────────

const FlapCell = React.memo(function FlapCell({
  target,
  delay,
  stepMs,
  flipDuration,
}: {
  target: string;
  delay: number;
  stepMs: number;
  flipDuration: number;
}) {
  const [current, setCurrent] = useState(" ");
  const [prev, setPrev] = useState(" ");
  const [flipId, setFlipId] = useState(0);
  const [accent, setAccent] = useState<AccentColor | null>(null);
  const [prevAccent, setPrevAccent] = useState<AccentColor | null>(null);

  const curRef = useRef(" ");
  const tgtRef = useRef<string | null>(null);
  const accentRef = useRef<AccentColor | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (startTimer.current) clearTimeout(startTimer.current);
    if (stepTimer.current) clearTimeout(stepTimer.current);
    startTimer.current = null;
    stepTimer.current = null;

    const normalized = FLAP_CHARS.includes(target.toUpperCase())
      ? target.toUpperCase()
      : " ";
    if (normalized === tgtRef.current) return;
    tgtRef.current = normalized;

    if (normalized === " " && curRef.current === " ") return;

    const scrambleCount =
      normalized === " "
        ? 6 + Math.floor(Math.random() * 6)
        : 20 + Math.floor(Math.random() * 10);

    const runStep = (i: number) => {
      const isLast = i === scrambleCount;
      const ch = isLast
        ? normalized
        : FLAP_CHARS[1 + Math.floor(Math.random() * (FLAP_CHARS.length - 1))];

      // Accent color is ONLY applied during flipping, cleared when final character arrives
      const newAccent = isLast
        ? null
        : Math.random() < 0.25
          ? ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)]
          : null;

      setPrev(curRef.current);
      setPrevAccent(accentRef.current);
      curRef.current = ch;
      accentRef.current = newAccent;
      setCurrent(ch);
      setAccent(newAccent);
      setFlipId((n) => n + 1);

      if (!isLast) {
        stepTimer.current = setTimeout(() => runStep(i + 1), stepMs);
      }
    };

    startTimer.current = setTimeout(() => runStep(1), delay);

    return () => {
      if (startTimer.current) clearTimeout(startTimer.current);
      if (stepTimer.current) clearTimeout(stepTimer.current);
      startTimer.current = null;
      stepTimer.current = null;
      tgtRef.current = null;
    };
  }, [target, delay, stepMs]);

  const show = current === " " ? "\u00A0" : current;
  const showPrev = prev === " " ? "\u00A0" : prev;

  const textCx =
    "absolute inset-x-0 flex select-none items-center justify-center tracking-wider";

  const topBg = accent?.top ?? "bg-[#141417]";
  const bottomBg = accent?.bottom ?? "bg-[#141417]";
  const textColor = accent?.text ?? "text-white";

  const flapTopBg = prevAccent?.top ?? "bg-[#1a1a1f]";
  const flapTextColor = prevAccent?.text ?? "text-white";

  const bottomDelay = flipDuration * 0.45;

  return (
    <div className="relative flex aspect-[3/5] flex-col overflow-hidden rounded-[3px] border border-[#23232c] bg-[#141417] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] select-none">
      {/* Flap content area */}
      <div className="relative flex-1 perspective-dramatic transform-3d">
        {/* Mechanical side pin notches */}
        <div className="absolute inset-y-0 inset-x-0 z-40 pointer-events-none flex items-center justify-between px-[0.5px]">
          <div className="h-1.5 w-[2px] rounded-r-sm bg-[#0a0a0c]" />
          <div className="h-1.5 w-[2px] rounded-l-sm bg-[#0a0a0c]" />
        </div>

        {/* Static top – character top half */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-[calc(50%-0.5px)] overflow-hidden rounded-t-[2px]",
            topBg
          )}
        >
          <div
            className={cn(textCx, textColor, "top-0 h-[200%]")}
            style={CELL_TEXT_STYLE}
          >
            {show}
          </div>
        </div>

        {/* Static bottom – character bottom half */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 h-[calc(50%-0.5px)] overflow-hidden rounded-b-[2px]",
            bottomBg
          )}
        >
          <div
            className={cn(textCx, textColor, "bottom-0 h-[200%]")}
            style={CELL_TEXT_STYLE}
          >
            {show}
          </div>

          {/* Slit card line texture at bottom of flap */}
          <div className="absolute inset-x-0 bottom-[2px] z-0 flex flex-col gap-[2px] px-1 opacity-25 pointer-events-none">
            <div className="h-[0.5px] w-full bg-black" />
            <div className="h-[0.5px] w-full bg-black" />
          </div>

          {flipId > 0 && (
            <motion.div
              key={`s${flipId}`}
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.7),transparent_60%)]"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: flipDuration * 1.2, ease: "easeOut" }}
            />
          )}
        </div>

        {/* Flipping top flap – old character top half, drops down */}
        {flipId > 0 && (
          <motion.div
            key={flipId}
            className={cn(
              "absolute inset-x-0 top-0 z-10 h-[calc(50%-0.5px)] origin-bottom overflow-hidden rounded-t-[2px] backface-hidden transform-3d",
              flapTopBg
            )}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -100 }}
            transition={{
              duration: flipDuration,
              ease: [0.55, 0.055, 0.675, 0.19],
            }}
          >
            <div
              className={cn(textCx, flapTextColor, "top-0 h-[200%]")}
              style={CELL_TEXT_STYLE}
            >
              {showPrev}
            </div>
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.85))]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: flipDuration }}
            />
          </motion.div>
        )}

        {/* Flipping bottom flap – new character bottom half, rises up */}
        {flipId > 0 && (
          <motion.div
            key={`b${flipId}`}
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 h-[calc(50%-0.5px)] origin-top overflow-hidden rounded-b-[2px] backface-hidden transform-3d",
              bottomBg
            )}
            initial={{ rotateX: 90 }}
            animate={{ rotateX: 0 }}
            transition={{
              duration: flipDuration * 0.85,
              delay: bottomDelay,
              ease: [0.33, 1.55, 0.64, 1],
            }}
          >
            <div
              className={cn(textCx, textColor, "bottom-0 h-[200%]")}
              style={CELL_TEXT_STYLE}
            >
              {show}
            </div>
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,transparent,rgba(0,0,0,0.6))]"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              transition={{
                duration: flipDuration * 0.85,
                delay: bottomDelay,
              }}
            />
          </motion.div>
        )}

        {/* Center Hinge Split Slit */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 h-[1.5px] -translate-y-[0.75px] bg-[#070709] shadow-[0_0.5px_0_rgba(255,255,255,0.06)]" />
      </div>
    </div>
  );
},
(prevProps, nextProps) =>
  prevProps.target === nextProps.target &&
  prevProps.delay === nextProps.delay &&
  prevProps.stepMs === nextProps.stepMs &&
  prevProps.flipDuration === nextProps.flipDuration
);

// ── Word Wrap ─────────────────────────────────────────────────────────

function wrapParagraph(paragraph: string, maxCols: number): string[] {
  const lines: string[] = [];
  const words = paragraph.split(/[ \t]+/).filter(Boolean);
  let currentLine = "";

  for (const word of words) {
    if (word.length > maxCols) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      lines.push(word.slice(0, maxCols));
      continue;
    }

    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxCols) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function wrapText(input: string, maxCols: number): string[] {
  return input
    .split("\n")
    .flatMap((paragraph) =>
      paragraph.trim() === "" ? [""] : wrapParagraph(paragraph, maxCols)
    );
}

// ── Main TextFlippingBoard Component ──────────────────────────────────

export interface TextFlippingBoardProps {
  rows?: string[];
  text?: string;
  className?: string;
  /** Total animation duration in seconds. Defaults to ~1.2s. */
  duration?: number;
  /** Auto rotation interval in ms (default 6500ms) */
  quoteIntervalMs?: number;
}

export function TextFlippingBoard({
  rows,
  text: explicitText,
  className,
  duration = BASE_TOTAL_S,
  quoteIntervalMs = 9500,
}: TextFlippingBoardProps) {
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * FAMOUS_QUOTES.length)
  );

  // Automatically cycle through random famous quotes if no explicit text is provided
  useEffect(() => {
    if (explicitText) return;
    const timer = setInterval(() => {
      setQuoteIndex(Math.floor(Math.random() * FAMOUS_QUOTES.length));
    }, quoteIntervalMs);
    return () => clearInterval(timer);
  }, [explicitText, quoteIntervalMs]);

  const currentDisplay = useMemo(() => {
    if (explicitText) return explicitText;
    const q = FAMOUS_QUOTES[quoteIndex] || FAMOUS_QUOTES[0];
    return `"${q.text.toUpperCase()}"\n- ${q.author.toUpperCase()}`;
  }, [explicitText, quoteIndex]);

  const scale = duration / BASE_TOTAL_S;
  const colDelay = BASE_COL_DELAY * scale;
  const rowDelay = BASE_ROW_DELAY * scale;
  const stepMs = BASE_STEP_MS * scale;
  const flipDur = Math.min(0.6, Math.max(0.15, BASE_FLIP_S * scale));

  const board = useMemo(() => {
    const grid: string[][] = Array.from({ length: BOARD_ROWS }, () =>
      Array.from({ length: BOARD_COLS }, () => " ")
    );

    const lines = wrapText(currentDisplay, BOARD_COLS).slice(0, BOARD_ROWS);
    const startRow = Math.max(0, Math.floor((BOARD_ROWS - lines.length) / 2));

    lines.forEach((line, i) => {
      const row = startRow + i;
      if (row >= BOARD_ROWS) return;
      const chars = line.split("");
      const startCol = Math.max(
        0,
        Math.floor((BOARD_COLS - chars.length) / 2)
      );
      chars.forEach((ch, c) => {
        if (startCol + c < BOARD_COLS) {
          grid[row][startCol + c] = ch;
        }
      });
    });

    return grid;
  }, [currentDisplay]);

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-3xl rounded-2xl bg-[#09090b] border border-[#1f1f24] p-3 sm:p-5 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.05)]",
        className
      )}
    >
      <div
        className="grid gap-[2px] sm:gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)` }}
      >
        {board.map((row, r) =>
          row.map((ch, c) => (
            <FlapCell
              key={`${r}-${c}`}
              target={ch}
              delay={c * colDelay + r * rowDelay}
              stepMs={stepMs}
              flipDuration={flipDur}
            />
          ))
        )}
      </div>
    </div>
  );
}
