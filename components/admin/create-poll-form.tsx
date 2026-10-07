"use client";

import { Minus, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ApiResult } from "@/lib/api";
import { OPTION_KEYS, type MediaType } from "@/lib/domain";
import { Button, ErrorText, FIELD, Section } from "./ui";

type Act = (path: string, payload?: unknown) => Promise<ApiResult>;
interface Row {
  label: string;
  type: MediaType | "";
  src: string;
}

const MEDIA: { value: MediaType | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "image", label: "Image" },
  { value: "code", label: "Code" },
  { value: "text", label: "Text" },
  { value: "audio", label: "Audio" },
];
const emptyRow = (): Row => ({ label: "", type: "", src: "" });

/** Form to create a poll with 2 to 4 options, optional media and answer. */
export function CreatePollForm({ act }: { act: Act }) {
  const [question, setQuestion] = useState("");
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
    const bad = rows.findIndex((r) => r.type && !r.src.trim().startsWith("/"));
    if (bad >= 0) {
      setError(
        `Option ${OPTION_KEYS[bad]}: add a media path that starts with /.`,
      );
      return;
    }
    setBusy(true);
    const res = await act("/api/admin/poll", {
      question,
      options: rows.map((r) => ({
        label: r.label,
        ...(r.type ? { media: { type: r.type, src: r.src.trim() } } : {}),
      })),
      ...(correct ? { correct } : {}),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error ?? "Could not create the poll. Try again.");
      return;
    }
    setQuestion("");
    setRows([emptyRow(), emptyRow()]);
    setCorrect("");
    setDone("Poll created. It stays closed until you open it.");
  }

  return (
    <Section id="create-heading" title="Create poll">
      <form
        onSubmit={submit}
        className="grid gap-4 rounded-xl border border-line bg-white p-4"
      >
        <div className="grid gap-1.5">
          <label htmlFor="poll-question" className="font-semibold">
            Question
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

        {rows.map((row, i) => {
          const key = OPTION_KEYS[i];
          return (
            <fieldset
              key={key}
              className="grid gap-2 border-t border-line pt-4 sm:grid-cols-[minmax(0,1fr)_8.5rem]"
            >
              <legend className="float-left mb-2 w-full font-semibold sm:col-span-2">
                Option {key}
              </legend>
              <div className="grid gap-1.5 sm:col-span-2">
                <label htmlFor={`opt-${key}-label`} className="text-sm">
                  Text
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
                  Media
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
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5 sm:order-1">
                <label htmlFor={`opt-${key}-src`} className="text-sm">
                  Media path
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

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setRows((rs) => [...rs, emptyRow()])}
            disabled={rows.length >= 4}
          >
            <Plus aria-hidden />
            Add option
          </Button>
          <Button onClick={removeRow} disabled={rows.length <= 2}>
            <Minus aria-hidden />
            Remove option
          </Button>
        </div>

        <div className="grid gap-1.5 border-t border-line pt-4">
          <label htmlFor="poll-correct" className="font-semibold">
            Correct option
          </label>
          <select
            id="poll-correct"
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
            className={FIELD}
          >
            <option value="">No correct option</option>
            {rows.map((_, i) => (
              <option key={OPTION_KEYS[i]} value={OPTION_KEYS[i]}>
                Option {OPTION_KEYS[i]}
              </option>
            ))}
          </select>
        </div>

        {error && <ErrorText>{error}</ErrorText>}
        <p
          role="status"
          className="text-sm font-medium text-green empty:hidden"
        >
          {done}
        </p>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Creating poll..." : "Create poll"}
        </Button>
      </form>
    </Section>
  );
}
