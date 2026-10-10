"use client";

import { useEffect, useState } from "react";
import { REACTIONS } from "@/components/reaction-icon";
import { useRoom } from "@/components/room";
import { post, withRoom } from "@/lib/api";
import { REACTION_TYPES, type Reaction } from "@/lib/domain";
import { errorText } from "./error-note";
import styles from "./reaction-bar.module.css";

/** Sticky bar of four reaction buttons; reactions float up on the projector. */
export function ReactionBar() {
  const room = useRoom();
  // The count in the key restarts the pop on every accepted tap.
  const [popped, setPopped] = useState<{ type: Reaction; n: number } | null>(
    null,
  );
  // slow marks a 429; the buttons stay off until the note clears.
  const [note, setNote] = useState<{ text: string; slow: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 3000);
    return () => clearTimeout(timer);
  }, [note]);

  async function react(type: Reaction) {
    const res = await post(withRoom("/api/react", room), { type });
    if (res.ok) setPopped((p) => ({ type, n: (p?.n ?? 0) + 1 }));
    else if (res.status === 429)
      setNote({ text: "Slow down a little.", slow: true });
    else
      setNote({
        text: errorText(res.data, "Your reaction did not go through."),
        slow: false,
      });
  }

  return (
    <div className="sticky bottom-0 z-10 border-t border-line bg-paper/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      <p
        role="status"
        className={`px-2 text-center text-sm font-medium text-rose ${note ? "pt-2" : "sr-only"}`}
      >
        {note?.text}
      </p>
      <div
        role="group"
        aria-label="Send a reaction"
        className="grid grid-cols-4 gap-1 py-1.5"
      >
        {REACTION_TYPES.map((type) => {
          const { Icon, label, color } = REACTIONS[type];
          const hit = popped?.type === type;
          return (
            <button
              key={type}
              type="button"
              aria-label={label}
              disabled={note?.slow}
              onClick={() => void react(type)}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold text-muted transition-[transform,background-color,color,opacity] enabled:hover:bg-line/60 enabled:hover:text-ink enabled:active:scale-90 disabled:opacity-40 motion-reduce:active:scale-100"
            >
              <Icon
                key={hit ? popped.n : 0}
                aria-hidden
                className={`size-6 ${color} ${hit ? styles.pop : ""}`}
              />
              <span aria-hidden>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
