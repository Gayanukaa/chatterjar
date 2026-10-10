"use client";

import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, ErrorText, FIELD } from "./ui";
import { Credit } from "@/components/credit";
import { Logo } from "@/components/logo";

/** Asks for the admin key when none is stored or the stored one was rejected. */
export function KeyForm({
  error,
  onSubmit,
  title,
  description,
  label,
  button,
}: {
  error: string | null;
  onSubmit: (key: string) => void;
  title?: string;
  description?: string;
  label?: string;
  button?: string;
}) {
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const key = value.trim();
    if (key) onSubmit(key);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
        <Logo className="size-10" />
        {title ?? "Chatterjar admin"}
      </h1>
      <p className="mt-2 text-muted">
        {description ??
          "Enter the admin key to run polls, questions and the quiz."}
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-3">
        <label htmlFor="admin-key" className="font-semibold">
          {label ?? "Admin key"}
        </label>
        <input
          id="admin-key"
          name="admin-key"
          type="password"
          autoComplete="current-password"
          spellCheck={false}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={FIELD}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" variant="primary">
          <KeyRound aria-hidden />
          {button ?? "Open admin"}
        </Button>
      </form>
      <Credit className="mt-8 text-sm" />
    </main>
  );
}
