"use client";

import Image from "next/image";
import { Headphones } from "lucide-react";
import { useEffect, useState } from "react";
import type { Media } from "@/lib/domain";

/** Shows a poll option's media: image, code or text file, or audio. */
export function OptionMedia({
  media,
  label,
  playAudio = false,
}: {
  media: Media;
  label: string;
  playAudio?: boolean;
}) {
  if (media.type === "image") {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-line">
        <Image
          src={media.src}
          alt={`Sample ${label}`}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    );
  }
  if (media.type === "audio") {
    return playAudio ? (
      <audio controls preload="none" src={media.src} className="w-full">
        Sample {label}
      </audio>
    ) : (
      <p className="flex items-center gap-2 rounded-xl bg-line/60 px-3 py-3 text-sm text-muted">
        <Headphones aria-hidden className="size-5 shrink-0" />
        Listen on the projector
      </p>
    );
  }
  return <TextFile src={media.src} code={media.type === "code"} />;
}

function TextFile({ src, code }: { src: string; code: boolean }) {
  const [text, setText] = useState("Loading...");
  useEffect(() => {
    let live = true;
    fetch(src)
      .then((r) => r.text())
      .then((body) => live && setText(body))
      .catch(() => live && setText("Could not load this file."));
    return () => {
      live = false;
    };
  }, [src]);
  return (
    <pre
      className={`max-h-72 overflow-auto rounded-xl bg-ink/[0.04] p-3 text-left text-xs leading-relaxed whitespace-pre-wrap ${code ? "font-mono" : "font-body text-sm"}`}
    >
      {text}
    </pre>
  );
}
