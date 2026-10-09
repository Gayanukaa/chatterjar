"use client";

import { Minus, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ApiResult } from "@/lib/api";
import {
  OPTION_KEYS,
  POLL_KINDS,
  type MediaType,
  type PollKind,
} from "@/lib/domain";
import { useT } from "@/lib/i18n/react";
import { Button, ErrorText, FIELD, Section } from "./ui";

type Act = (path: string, payload?: unknown) => Promise<ApiResult>;
interface Row {
  label: string;
  type: MediaType | "";
  src: string;
}

const MEDIA = ["", "image", "code", "text", "audio"] as const;
const emptyRow = (): Row => ({ label: "", type: "", src: "" });

/** Form to create a poll: choice (2 to 4 options), word cloud or rating. */
export function CreatePollForm({ act }: { act: Act }) {
  const t = useT();
  const [question, setQuestion] = useState("");
  const [kind, setKind] = useState<PollKind>("choice");
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow()]);
  const [correct, setCorrect] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function removeRow() {
    if (correct === OPTION_KEYS[rows.length - 1]) setCorrect("");
    setRows((rs) => rs.slice(0, -1));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    const choice = kind === "choice";
    const bad = rows.findIndex((r) => r.type && !r.src.trim().startsWith("/"));
    if (choice && bad >= 0) {
      setError(t("admin.create.badMedia", { key: OPTION_KEYS[bad] }));
      return;
    }
    setBusy(true);
    const res = await act(
      "/api/admin/poll",
      choice
        ? {
            question,
            kind,
            options: rows.map((r) => ({
              label: r.label,
              ...(r.type ? { media: { type: r.type, src: r.src.trim() } } : {}),
            })),
            ...(correct ? { correct } : {}),
          }
        : { question, kind },
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error ?? t("admin.create.failed"));
      return;
    }
    setQuestion("");
    setRows([emptyRow(), emptyRow()]);
    setCorrect("");
    setDone(t("admin.create.done"));
  }

  return (
    <Section id="create-heading" title={t("admin.create.heading")}>
      <form
        onSubmit={submit}
        className="grid gap-4 rounded-xl border border-line bg-white p-4"
      >
        <div className="grid gap-1.5">
          <label htmlFor="poll-question" className="font-semibold">
            {t("admin.create.question")}
          </label>
          <textarea
            id="poll-question"
            required
            maxLength={300}
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className={`${FIELD} py-2.5 leading-relaxed`}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="poll-kind" className="font-semibold">
            {t("admin.create.type")}
          </label>
          <select
            id="poll-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as PollKind)}
            className={FIELD}
          >
            {POLL_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`common.pollKind.${k}`)}
              </option>
            ))}
          </select>
          {kind === "words" && (
            <p className="text-sm text-muted">{t("admin.create.wordsHint")}</p>
          )}
          {kind === "rating" && (
            <p className="text-sm text-muted">{t("admin.create.ratingHint")}</p>
          )}
        </div>

        {kind === "choice" &&
          rows.map((row, i) => {
            const key = OPTION_KEYS[i];
            return (
              <fieldset
                key={key}
                className="grid gap-2 border-t border-line pt-4 sm:grid-cols-[minmax(0,1fr)_8.5rem]"
              >
                <legend className="float-left mb-2 w-full font-semibold sm:col-span-2">
                  {t("admin.create.option", { key })}
                </legend>
                <div className="grid gap-1.5 sm:col-span-2">
                  <label htmlFor={`opt-${key}-label`} className="text-sm">
                    {t("admin.create.text")}
                  </label>
                  <input
                    id={`opt-${key}-label`}
                    required
                    maxLength={200}
                    value={row.label}
                    onChange={(e) => setRow(i, { label: e.target.value })}
                    className={FIELD}
                  />
                </div>
                <div className="grid gap-1.5 sm:order-2">
                  <label htmlFor={`opt-${key}-type`} className="text-sm">
                    {t("admin.create.media")}
                  </label>
                  <select
                    id={`opt-${key}-type`}
                    value={row.type}
                    onChange={(e) =>
                      setRow(i, { type: e.target.value as Row["type"] })
                    }
                    className={FIELD}
                  >
                    {MEDIA.map((m) => (
                      <option key={m} value={m}>
                        {t(`admin.create.mediaType.${m || "none"}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5 sm:order-1">
                  <label htmlFor={`opt-${key}-src`} className="text-sm">
                    {t("admin.create.mediaPath")}
                  </label>
                  <input
                    id={`opt-${key}-src`}
                    disabled={!row.type}
                    placeholder="/spot/assets/x.png"
                    spellCheck={false}
                    autoComplete="off"
                    value={row.src}
                    onChange={(e) => setRow(i, { src: e.target.value })}
                    className={FIELD}
                  />
                </div>
              </fieldset>
            );
          })}

        {kind === "choice" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setRows((rs) => [...rs, emptyRow()])}
                disabled={rows.length >= 4}
              >
                <Plus aria-hidden />
                {t("admin.create.addOption")}
              </Button>
              <Button onClick={removeRow} disabled={rows.length <= 2}>
                <Minus aria-hidden />
                {t("admin.create.removeOption")}
              </Button>
            </div>

            <div className="grid gap-1.5 border-t border-line pt-4">
              <label htmlFor="poll-correct" className="font-semibold">
                {t("admin.create.correct")}
              </label>
              <select
                id="poll-correct"
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
                className={FIELD}
              >
                <option value="">{t("admin.create.noCorrect")}</option>
                {rows.map((_, i) => (
                  <option key={OPTION_KEYS[i]} value={OPTION_KEYS[i]}>
                    {t("admin.create.option", { key: OPTION_KEYS[i] })}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {error && <ErrorText>{error}</ErrorText>}
        <p
          role="status"
          className="text-sm font-medium text-green empty:hidden"
        >
          {done}
        </p>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? t("admin.create.creating") : t("admin.create.submit")}
        </Button>
      </form>
    </Section>
  );
}
