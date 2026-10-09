"use client";

import { renderSVG } from "uqr";
import { useMemo, useSyncExternalStore } from "react";
import { useRoom } from "@/components/room";
import { roomPath } from "@/lib/api";
import { useT } from "@/lib/i18n/react";
import styles from "./screen.module.css";

const noop = () => () => {};

/** Scan-to-join QR code for this site's phone page; empty on the server render. */
export function JoinQr() {
  const room = useRoom();
  const t = useT();
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );
  const url = origin ? origin + (room === "main" ? "" : roomPath(room)) : "";
  const host = url.replace(/^https?:\/\//, "");
  // The SVG is built locally from our own URL, so inserting it is safe.
  const svg = useMemo(
    () => (url ? renderSVG(url, { border: 1, ecc: "M" }) : ""),
    [url],
  );
  if (!svg) return null;
  return (
    <figure
      data-testid="screen-qr"
      className={`flex items-center gap-5 rounded-2xl bg-white p-4 ring-1 ring-line ${styles.qrCard}`}
    >
      <div
        role="img"
        aria-label={t("screen.qrLabel", { host })}
        className="size-36 shrink-0 [&_svg]:size-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption>
        <p className="font-heading text-3xl leading-tight font-semibold">
          {t("screen.scanToJoin")}
        </p>
        <p className="mt-2 text-lg text-muted">{t("screen.pointCamera")}</p>
      </figcaption>
    </figure>
  );
}
