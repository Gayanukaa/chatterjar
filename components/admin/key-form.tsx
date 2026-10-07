"use client";

import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, ErrorText, FIELD } from "./ui";

/** Asks for the admin key when none is stored or the stored one was rejected. */
export function KeyForm({
  error,
  onSubmit,
}: {
  error: string | null;
  onSubmit: (key: string) => void;
}) {
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const key = value.trim();
    if (key) onSubmit(key);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Room admin</h1>
      <p className="mt-2 text-muted">
        Enter the admin key to run polls, questions and the quiz.
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-3">
        <label htmlFor="admin-key" className="font-semibold">
          Admin key
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
          Open admin
        </Button>
      </form>
    </main>
  );
}
