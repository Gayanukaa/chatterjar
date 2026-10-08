"use client";

import {
  CircleCheck,
  Eye,
  EyeOff,
  ListPlus,
  Lock,
  Play,
  Radio,
} from "lucide-react";
import { useState } from "react";
import type { ApiResult } from "@/lib/api";
import type { PollStatus } from "@/lib/domain";
import { Button, ErrorText, FIELD, Section } from "./ui";
import type { AdminPoll, PackSummary } from "./use-admin";

type Act = (path: string, payload?: unknown) => Promise<ApiResult>;

const CHIP: Record<PollStatus, string> = {
  open: "bg-green/10 text-green",
  closed: "bg-ink/[0.06] text-muted",
  revealed: "bg-violet/10 text-violet",
};
const CHIP_LABEL: Record<PollStatus, string> = {
  open: "Open",
  closed: "Closed",
  revealed: "Revealed",
};
const ACTIONS = [
  { status: "open", label: "Open", Icon: Play },
  { status: "closed", label: "Close", Icon: Lock },
  { status: "revealed", label: "Reveal", Icon: Eye },
] as const;

const fileName = (src: string) => src.split("/").pop() ?? src;

/** Polls newest first with votes, correct option and open/close/reveal. */
export function PollList({
  polls,
  activeId,
  packs,
  act,
}: {
  polls: AdminPoll[] | null;
  activeId: string | null;
  packs: PackSummary[];
  act: Act;
}) {
  const [pack, setPack] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Answers stay hidden until reveal, in case /admin is on a shared screen.
  const [peek, setPeek] = useState<string | null>(null);

  async function run(tag: string, path: string, payload?: unknown) {
    setBusy(tag);
    setError(null);
    const res = await act(path, payload);
    if (!res.ok) setError(res.data.error ?? "The action failed. Try again.");
    setBusy(null);
  }

  return (
    <Section
      id="polls-heading"
      title="Polls"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="pack-select" className="sr-only">
            Content pack
          </label>
          <select
            id="pack-select"
            value={pack}
            onChange={(e) => setPack(e.target.value)}
            className={`${FIELD} w-auto`}
          >
            <option value="">Choose a content pack</option>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.count} {p.count === 1 ? "poll" : "polls"})
              </option>
            ))}
          </select>
          <Button
            onClick={() => run("presets", "/api/admin/presets", { pack })}
            disabled={busy !== null || !pack}
          >
            <ListPlus aria-hidden />
            Load pack
          </Button>
        </div>
      }
    >
      {error && (
        <div className="mb-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {polls === null ? (
        <p className="text-muted">Loading polls...</p>
      ) : polls.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-muted">
          No polls yet. Load the preset polls or create a poll.
        </p>
      ) : (
        <ol className="grid gap-3">
          {polls.map((poll) => {
            const active = poll.id === activeId;
            const counts = poll.options.map((o) =>
              Number(poll.votes[o.key] ?? 0),
            );
            const total = counts.reduce((a, b) => a + b, 0);
            const max = Math.max(1, ...counts);
            return (
              <li
                key={poll.id}
                className={`rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(24,32,47,0.05)] ${active ? "border-blue ring-1 ring-blue" : "border-line"}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-semibold ${CHIP[poll.status]}`}
                  >
                    {CHIP_LABEL[poll.status]}
                  </span>
                  {active && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue/10 px-2.5 py-0.5 font-semibold text-blue">
                      <Radio aria-hidden className="size-3.5" />
                      Active on phones and screen
                    </span>
                  )}
                  <span className="ml-auto tabular-nums text-muted">
                    {total} {total === 1 ? "vote" : "votes"}
                  </span>
                </div>
                <h3 className="mt-2 font-heading text-lg leading-snug font-semibold text-pretty">
                  {poll.question}
                </h3>
                <ul className="mt-3 grid gap-2.5">
                  {poll.options.map((o, i) => {
                    const correct =
                      o.key === poll.correct &&
                      (poll.status === "revealed" || peek === poll.id);
                    const text =
                      o.media && o.label === o.key
                        ? fileName(o.media.src)
                        : o.label;
                    return (
                      <li key={o.key} className="text-sm">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`grid size-6 shrink-0 place-items-center rounded-md font-heading text-xs font-bold ${correct ? "bg-green text-white" : "bg-ink/[0.07] text-ink"}`}
                          >
                            {o.key}
                          </span>
                          <span className="min-w-0 flex-1 wrap-break-word">
                            {text}
                            {o.media && (
                              <span className="text-muted">
                                {" "}
                                ({o.media.type})
                              </span>
                            )}
                            {correct && (
                              <span className="ml-1.5 inline-flex items-center gap-1 align-[-2px] font-semibold text-green">
                                <CircleCheck aria-hidden className="size-4" />
                                Correct
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {counts[i]}
                          </span>
                        </div>
                        <div className="mt-1.5 ml-8.5 h-1.5 overflow-hidden rounded-full bg-line">
                          <div
                            className={`h-full rounded-full transition-[width] duration-500 ease-out ${correct ? "bg-green" : "bg-blue"}`}
                            style={{ width: `${(counts[i] / max) * 100}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {!poll.correct ? (
                  <p className="mt-3 text-sm text-muted">No correct option.</p>
                ) : (
                  poll.status !== "revealed" && (
                    <button
                      type="button"
                      aria-pressed={peek === poll.id}
                      onClick={() => setPeek(peek === poll.id ? null : poll.id)}
                      className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted hover:text-ink"
                    >
                      {peek === poll.id ? (
                        <EyeOff aria-hidden className="size-4" />
                      ) : (
                        <Eye aria-hidden className="size-4" />
                      )}
                      {peek === poll.id ? "Hide answer" : "Show answer"}
                    </button>
                  )
                )}
                <div
                  role="group"
                  aria-label={`Actions for: ${poll.question}`}
                  className="mt-4 grid grid-cols-3 gap-2"
                >
                  {ACTIONS.map(({ status, label, Icon }) => {
                    const tag = `${poll.id}:${status}`;
                    return (
                      <Button
                        key={status}
                        className="px-2"
                        disabled={
                          busy !== null || (active && poll.status === status)
                        }
                        aria-busy={busy === tag}
                        onClick={() =>
                          run(tag, "/api/admin/status", { id: poll.id, status })
                        }
                      >
                        <Icon aria-hidden />
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
