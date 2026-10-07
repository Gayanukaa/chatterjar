import type { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANT = {
  primary: "border-transparent bg-blue text-white hover:bg-blue/90",
  secondary:
    "border-line bg-white text-ink hover:border-ink/25 hover:bg-ink/[0.03]",
  danger: "border-rose/40 bg-white text-rose hover:bg-rose/[0.06]",
};

export const FIELD =
  "min-h-12 w-full rounded-lg border border-line bg-white px-3 text-base text-ink placeholder:text-muted focus-visible:border-blue disabled:bg-ink/[0.03] disabled:text-muted";

/** Admin button, at least 48 px tall; defaults to type="button". */
export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
}) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-4 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-[18px] [&_svg]:shrink-0 ${VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}

export function Section({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-rose/[0.07] px-3 py-2.5 text-sm font-medium text-rose"
    >
      {children}
    </p>
  );
}
