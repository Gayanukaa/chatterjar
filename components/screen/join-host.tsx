"use client";

import { Smartphone } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Logo } from "@/components/logo";

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
      <Logo className="size-7 shrink-0" />
      <span className="font-heading font-semibold text-ink">Chatterjar</span>
      <span aria-hidden>·</span>
      <Smartphone aria-hidden className="size-5 shrink-0" />
      <span>
        Join at <span className="font-semibold text-ink">{host}</span>
      </span>
    </p>
  );
}
