import { CircleAlert } from "lucide-react";

/** Inline error from the API, announced to screen readers. */
export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-rose/[0.07] px-3 py-3 text-sm font-medium text-rose"
    >
      <CircleAlert aria-hidden className="mt-px size-5 shrink-0" />
      {message}
    </p>
  );
}

/** Error text from an API result, with a fallback when the body has none. */
export function errorText(data: { error?: string }, fallback: string) {
  return data.error || fallback;
}
