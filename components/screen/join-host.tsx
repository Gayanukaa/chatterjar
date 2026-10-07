"use client";

import { Smartphone } from "lucide-react";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** "Join at <host>" from window.location; empty on the server render. */
export function JoinHost() {
  const host = useSyncExternalStore(
    noop,
    () => window.location.host,
    () => "",
  );
  return (
    <p className="flex items-center gap-2 text-lg text-muted">
      <Smartphone aria-hidden className="size-5 shrink-0" />
      <span>
        Join at <span className="font-semibold text-ink">{host}</span>
      </span>
    </p>
  );
}
