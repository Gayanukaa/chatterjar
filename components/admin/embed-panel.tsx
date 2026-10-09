"use client";

import { Code, Link2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { roomPath } from "@/lib/api";
import { embedQuery, type EmbedOptions, type EmbedShow } from "@/lib/embed";
import { Button, FIELD, Section } from "./ui";

const noop = () => () => {};

const SHOW_LABEL: Record<EmbedShow, string> = {
  poll: "Current poll",
  questions: "Top questions",
  tally: "Persona quiz",
  qr: "Join QR code",
  all: "Everything (like the projector)",
};

/** Embed URL and iframe code for slides (PowerPoint, reveal.js, any page). */
export function EmbedPanel({ room }: { room: string }) {
  const [opts, setOpts] = useState<EmbedOptions>({
    show: "poll",
    theme: "light",
    transparent: false,
  });
  const [note, setNote] = useState("");
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );
  const url = origin + roomPath(room, "embed") + embedQuery(opts);
  const code = `<iframe src="${url}" title="Chatterjar" width="960" height="540" style="border:0"></iframe>`;
  const set = (patch: Partial<EmbedOptions>) => {
    setOpts((o) => ({ ...o, ...patch }));
    setNote("");
  };

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNote(done);
    } catch {
      setNote("Could not copy. Select the text and copy it.");
    }
  }

  return (
    <Section id="embed-heading" title="Embed in slides">
      <div className="grid gap-4 rounded-xl border border-line bg-white p-4">
        <p className="text-sm text-muted">
          Show live room content inside a slide. Use the link in the PowerPoint
          Web Viewer add-in, or paste the code into reveal.js or a web page.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="embed-show" className="font-semibold">
              What to show
            </label>
            <select
              id="embed-show"
              value={opts.show}
              onChange={(e) => set({ show: e.target.value as EmbedShow })}
              className={FIELD}
            >
              {Object.entries(SHOW_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="embed-theme" className="font-semibold">
              Theme
            </label>
            <select
              id="embed-theme"
              value={opts.theme}
              onChange={(e) =>
                set({ theme: e.target.value as EmbedOptions["theme"] })
              }
              className={FIELD}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 font-semibold">
          <input
            type="checkbox"
            className="size-6 shrink-0 cursor-pointer accent-blue"
            checked={opts.transparent}
            onChange={(e) => set({ transparent: e.target.checked })}
          />
          Transparent background
        </label>

        <div className="grid gap-1.5">
          <label htmlFor="embed-url" className="font-semibold">
            Embed link
          </label>
          <input
            id="embed-url"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className={`${FIELD} font-mono text-sm`}
          />
          <Button onClick={() => copy(url, "Link copied.")}>
            <Link2 aria-hidden />
            Copy link
          </Button>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="embed-code" className="font-semibold">
            Iframe code
          </label>
          <textarea
            id="embed-code"
            readOnly
            rows={4}
            value={code}
            onFocus={(e) => e.target.select()}
            className={`${FIELD} resize-none py-2 font-mono text-sm`}
          />
          <Button onClick={() => copy(code, "Code copied.")}>
            <Code aria-hidden />
            Copy code
          </Button>
        </div>
        <p
          role="status"
          className={`min-h-5 text-sm font-medium ${note.startsWith("Could") ? "text-rose" : "text-green"}`}
        >
          {note}
        </p>
      </div>
    </Section>
  );
}
