"use client";

import { Download, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ApiResult } from "@/lib/api";
import { useT } from "@/lib/i18n/react";
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
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function run(path: string, done: string) {
    setBusy(true);
    setError(null);
    setNote("");
    const res = await act(path);
    if (res.ok) setNote(done);
    else setError(res.data.error ?? t("admin.room.failed"));
    setBusy(false);
    onDone();
  }

  async function save(format: "csv" | "json") {
    setBusy(true);
    setError(null);
    setNote("");
    const failed = await download(`/api/admin/export?format=${format}`);
    if (failed) setError(failed);
    else setNote(t("admin.room.downloaded"));
    setBusy(false);
  }

  function reset() {
    if (window.confirm(t("admin.room.resetConfirm")))
      void run("/api/admin/reset-room", t("admin.room.resetDone"));
  }

  return (
    <Section id="room-heading" title={t("admin.room.heading")}>
      <div className="grid gap-4 rounded-xl border border-line bg-white p-4">
        <div className="grid gap-2">
          <Button
            onClick={() =>
              run("/api/admin/withdraw", t("admin.room.withdrawDone"))
            }
            disabled={busy || !hasActive}
          >
            <EyeOff aria-hidden />
            {t("admin.room.withdraw")}
          </Button>
          <p className="text-sm text-muted">{t("admin.room.withdrawHint")}</p>
        </div>
        <div className="grid gap-2">
          <Button onClick={() => save("csv")} disabled={busy}>
            <Download aria-hidden />
            {t("admin.room.csv")}
          </Button>
          <Button onClick={() => save("json")} disabled={busy}>
            <Download aria-hidden />
            {t("admin.room.json")}
          </Button>
          <p className="text-sm text-muted">{t("admin.room.downloadHint")}</p>
        </div>
        <div className="grid gap-2">
          <Button variant="danger" onClick={reset} disabled={busy}>
            <Trash2 aria-hidden />
            {t("admin.room.reset")}
          </Button>
          <p className="text-sm text-muted">{t("admin.room.resetHint")}</p>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <p role="status" className="min-h-5 text-sm font-medium text-green">
          {note}
        </p>
      </div>
    </Section>
  );
}
