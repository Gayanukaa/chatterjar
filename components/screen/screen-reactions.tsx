"use client";

import { useEffect, useRef, useState } from "react";
import { REACTION_COLORS, REACTION_ICONS } from "@/components/reaction-icon";
import { REACTIONS, reactionBursts, type Reaction } from "@/lib/domain";
import styles from "./screen.module.css";

// More icons than this at once turns into noise on the projector.
const MAX_FLOATS = 20;
// Spread one poll's reactions over most of the 3 s poll gap.
const SPREAD_S = 2.4;

interface Float {
  id: number;
  type: Reaction;
  left: number;
  delay: number;
}

/** Floating icons for reactions since the last poll; none on first load. */
export function ReactionLayer({
  reactions,
}: {
  reactions: Record<Reaction, number>;
}) {
  const last = useRef<Record<Reaction, number> | null>(null);
  const nextId = useRef(0);
  const [floats, setFloats] = useState<Float[]>([]);

  useEffect(() => {
    const before = last.current;
    last.current = reactions;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const add = reactionBursts(before, reactions, MAX_FLOATS).map((type) => ({
      id: nextId.current++,
      type,
      left: 4 + Math.random() * 88,
      delay: Math.random() * SPREAD_S,
    }));
    if (add.length)
      setFloats((live) => [...live, ...add.slice(0, MAX_FLOATS - live.length)]);
  }, [reactions]);

  const done = (id: number) =>
    setFloats((live) => live.filter((f) => f.id !== id));

  return (
    // At lg the right 30% holds JoinQr; floats must not cover the code.
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 overflow-hidden lg:right-[30%]"
    >
      {floats.map((f) => {
        const Icon = REACTION_ICONS[f.type];
        return (
          <span
            key={f.id}
            className={`${styles.float} grid size-20 place-items-center rounded-full bg-paper shadow-lg ring-1 ring-line`}
            style={{ left: `${f.left}%`, animationDelay: `${f.delay}s` }}
            onAnimationEnd={() => done(f.id)}
          >
            <Icon className={`size-11 ${REACTION_COLORS[f.type]}`} />
          </span>
        );
      })}
    </div>
  );
}

/** Small running totals per reaction type for the projector footer. */
export function ReactionTotals({
  reactions,
}: {
  reactions: Record<Reaction, number>;
}) {
  return (
    <ul
      data-testid="screen-reactions"
      aria-label="Reactions"
      className="flex items-center gap-5 text-lg text-muted"
    >
      {REACTIONS.map(({ type, label }) => {
        const Icon = REACTION_ICONS[type];
        return (
          <li key={type} className="flex items-center gap-1.5">
            <Icon aria-hidden className={`size-5 ${REACTION_COLORS[type]}`} />
            <span className="sr-only">{label}:</span>
            <span className="font-semibold text-ink tabular-nums">
              {reactions[type] ?? 0}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
