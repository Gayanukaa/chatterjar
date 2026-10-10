import type { Question } from "@/lib/domain";
import styles from "./screen.module.css";

/** Smaller type for longer questions so the full text fits the column. */
function textSize(text: string) {
  if (text.length <= 70) return "text-xl";
  if (text.length <= 140) return "text-lg";
  return "text-base";
}

/** Top five student questions; new ones fade in, vote counts pulse. */
export function ScreenQuestions({ questions }: { questions: Question[] }) {
  const top = questions.slice(0, 5);
  return (
    <section
      data-testid="screen-questions"
      aria-labelledby="screen-questions-title"
      className="flex h-full min-h-0 flex-col"
    >
      <h2
        id="screen-questions-title"
        className="font-heading text-3xl font-semibold tracking-tight"
      >
        Top questions
      </h2>
      {top.length === 0 ? (
        <p className="mt-6 text-xl text-muted">
          No questions yet. Send one from your phone.
        </p>
      ) : (
        <ol className="mt-5 -mx-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {top.map((q, i) => (
            <li
              key={q.id}
              data-testid="screen-question"
              className={`${styles.enter} flex gap-4 rounded-xl px-3 py-2.5`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="w-12 shrink-0 text-right">
                <span
                  key={q.votes}
                  className={`${styles.pulse} font-heading text-3xl font-bold tabular-nums leading-none text-blue`}
                >
                  {q.votes}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {q.votes === 1 ? "vote" : "votes"}
                </span>
              </span>
              <p
                className={`min-w-0 leading-snug break-words ${textSize(q.text)}`}
              >
                {q.text}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
