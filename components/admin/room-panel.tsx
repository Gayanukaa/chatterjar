"use client";

import { Download, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ApiResult } from "@/lib/api";
import { Button, ErrorText, Section } from "./ui";

type Act = (path: string, payload?: unknown) => Promise<ApiResult>;

/** Withdraw the poll, download results, or reset the room. */
export function RoomPanel({
  act,
  download,
  hasActive,
  onDone,
}: {
  act: Act;
  download: (path: string) => Promise<string | null>;
  hasActive: boolean;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function run(path: string, done: string) {
    setBusy(true);
    setError(null);
    setNote("");
    const res = await act(path);
    if (res.ok) setNote(done);
    else setError(res.data.error ?? "Could not do that. Try again.");
    setBusy(false);
    onDone();
  }

  async function save(format: "csv" | "json") {
    setBusy(true);
    setError(null);
    setNote("");
    const failed = await download(`/api/admin/export?format=${format}`);
    if (failed) setError(failed);
    else setNote("Results downloaded.");
    setBusy(false);
  }

  function reset() {
    if (
      window.confirm(
        "Reset the room? This deletes all votes, questions and quiz answers, and withdraws the poll. The polls stay and you can open them again.",
      )
    )
      void run(
        "/api/admin/reset-room",
        "Room reset. Votes, questions and quiz answers are cleared.",
      );
  }

  return (
    <Section id="room-heading" title="Room">
      <div className="grid gap-4 rounded-xl border border-line bg-white p-4">
        <div className="grid gap-2">
          <Button
            onClick={() =>
              run(
                "/api/admin/withdraw",
                "Poll withdrawn. Phones and the screen show no poll.",
              )
            }
            disabled={busy || !hasActive}
          >
            <EyeOff aria-hidden />
            Withdraw poll
          </Button>
          <p className="text-sm text-muted">
            Hides the current poll from phones and the screen. Open it again
            from the poll list.
          </p>
        </div>
        <div className="grid gap-2">
          <Button onClick={() => save("csv")} disabled={busy}>
            <Download aria-hidden />
            Download results (CSV)
          </Button>
          <Button onClick={() => save("json")} disabled={busy}>
            <Download aria-hidden />
            Download results (JSON)
          </Button>
          <p className="text-sm text-muted">
            Saves every poll, question (hidden ones too) and the quiz tally.
          </p>
        </div>
        <div className="grid gap-2">
          <Button variant="danger" onClick={reset} disabled={busy}>
            <Trash2 aria-hidden />
            Reset room
          </Button>
          <p className="text-sm text-muted">
            Deletes all votes, questions, quiz answers and reactions, and closes
            every poll.
          </p>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <p role="status" className="min-h-5 text-sm font-medium text-green">
          {note}
        </p>
      </div>
    </Section>
  );
}
