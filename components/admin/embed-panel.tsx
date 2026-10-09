"use client";

import { Code, Link2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { roomPath } from "@/lib/api";
import { embedQuery, type EmbedOptions, type EmbedShow } from "@/lib/embed";
import { useT } from "@/lib/i18n/react";
import { Button, FIELD, Section } from "./ui";

const noop = () => () => {};

const SHOW_KEY = {
  poll: "admin.embed.showPoll",
  questions: "admin.embed.showQuestions",
  tally: "admin.embed.showTally",
  qr: "admin.embed.showQr",
  all: "admin.embed.showAll",
} as const satisfies Record<EmbedShow, string>;

/** Embed URL and iframe code for slides (PowerPoint, reveal.js, any page). */
export function EmbedPanel({ room }: { room: string }) {
  const t = useT();
  const [opts, setOpts] = useState<EmbedOptions>({
    show: "poll",
    theme: "light",
    transparent: false,
  });
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );
  const url = origin + roomPath(room, "embed") + embedQuery(opts);
  const code = `<iframe src="${url}" title="Chatterjar" width="960" height="540" style="border:0"></iframe>`;
  const set = (patch: Partial<EmbedOptions>) => {
    setOpts((o) => ({ ...o, ...patch }));
    setNote(null);
  };

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNote({ text: done, ok: true });
    } catch {
      setNote({ text: t("admin.embed.copyFailed"), ok: false });
    }
  }

  return (
    <Section id="embed-heading" title={t("admin.embed.title")}>
      <div className="grid gap-4 rounded-xl border border-line bg-white p-4">
        <p className="text-sm text-muted">{t("admin.embed.intro")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="embed-show" className="font-semibold">
              {t("admin.embed.show")}
            </label>
            <select
              id="embed-show"
              value={opts.show}
              onChange={(e) => set({ show: e.target.value as EmbedShow })}
              className={FIELD}
            >
              {Object.entries(SHOW_KEY).map(([value, key]) => (
                <option key={value} value={value}>
                  {t(key)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="embed-theme" className="font-semibold">
              {t("admin.embed.theme")}
            </label>
            <select
              id="embed-theme"
              value={opts.theme}
              onChange={(e) =>
                set({ theme: e.target.value as EmbedOptions["theme"] })
              }
              className={FIELD}
            >
              <option value="light">{t("admin.embed.themeLight")}</option>
              <option value="dark">{t("admin.embed.themeDark")}</option>
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
          {t("admin.embed.transparent")}
        </label>

        <div className="grid gap-1.5">
          <label htmlFor="embed-url" className="font-semibold">
            {t("admin.embed.link")}
          </label>
          <input
            id="embed-url"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className={`${FIELD} font-mono text-sm`}
          />
          <Button onClick={() => copy(url, t("admin.embed.linkCopied"))}>
            <Link2 aria-hidden />
            {t("admin.embed.copyLink")}
          </Button>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="embed-code" className="font-semibold">
            {t("admin.embed.code")}
          </label>
          <textarea
            id="embed-code"
            readOnly
            rows={4}
            value={code}
            onFocus={(e) => e.target.select()}
            className={`${FIELD} resize-none py-2 font-mono text-sm`}
          />
          <Button onClick={() => copy(code, t("admin.embed.codeCopied"))}>
            <Code aria-hidden />
            {t("admin.embed.copyCode")}
          </Button>
        </div>
        <p
          role="status"
          className={`min-h-5 text-sm font-medium ${note?.ok === false ? "text-rose" : "text-green"}`}
        >
          {note?.text}
        </p>
      </div>
    </Section>
  );
}
