"use client";

import {
  Pencil,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bars } from "@/components/bars";
import type { ApiResult } from "@/lib/api";
import type { RoomState } from "@/lib/domain";
import {
  MAX_ANSWER,
  MAX_PERSONA,
  MAX_PERSONAS,
  MAX_QUIZ_QUESTION,
  MAX_QUIZ_QUESTIONS,
  MIN_PERSONAS,
  STARTER,
  type Quiz,
  type AdminQuiz,
  type QuizMode,
} from "@/lib/quiz";
import { Button, ErrorText, FIELD, Section } from "./ui";
import { useAction, type Act } from "./use-admin";

const MODE_LABEL: Record<QuizMode, string> = {
  starter: "Starter quiz",
  custom: "Custom quiz",
  off: "Quiz is off",
};
const CLEARS = "This clears all quiz answers and the tally.";

/** Room quiz: mode, live tally, inline editor, on and off, and resets. */
export function QuizPanel({
  quiz,
  shared,
  act,
  onDone,
}: {
  quiz: AdminQuiz | null;
  shared: Pick<RoomState, "quiz" | "tally"> | null;
  act: Act;
  onDone: () => void;
}) {
  const { busy, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const personas = shared?.quiz?.personas ?? [];
  const items = personas.map((p) => ({
    key: p,
    label: p,
    value: Number(shared?.tally?.[p] ?? 0),
  }));
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const mode = quiz?.mode;
  const locked = busy !== null || !quiz;

  async function go(
    tag: string,
    path: string,
    payload: unknown,
    ask: string | null,
    done: string,
  ) {
    if (ask && !window.confirm(ask)) return;
    setNote("");
    const call = () => act(path, payload);
    if (await run(tag, call, "Could not do that. Try again.")) setNote(done);
    onDone();
  }

  async function save(next: Quiz) {
    const res = await act("/api/admin/quiz", { action: "save", quiz: next });
    onDone();
    if (res.ok) {
      setEditing(false);
      setNote("Quiz saved. Phones show the new questions.");
    }
    return res;
  }

  const kept = quiz?.saved ? "your custom quiz" : "the starter quiz";

  return (
    <Section
      id="quiz-heading"
      title="Quiz"
      action={
        mode !== "off" && (
          <span className="text-sm tabular-nums text-muted">
            {total} {total === 1 ? "answer" : "answers"}
          </span>
        )
      }
    >
      <div className="grid gap-4 rounded-xl border border-line bg-white p-4">
        {!quiz ? (
          <p className="text-muted">Loading the quiz...</p>
        ) : (
          <div className="grid gap-1">
            <p className="font-semibold">{MODE_LABEL[quiz.mode]}</p>
            <p className="text-sm text-muted">
              {quiz.quiz
                ? `${quiz.quiz.questions.length} ${quiz.quiz.questions.length === 1 ? "question" : "questions"}. Personas: ${quiz.quiz.personas.join(", ")}.`
                : `Phones do not show the Quiz tab and the screen hides the tally. Turning it on brings back ${kept}.`}
            </p>
          </div>
        )}

        {editing && quiz ? (
          <QuizEditor
            initial={quiz.saved ?? quiz.quiz ?? STARTER}
            off={quiz.mode === "off"}
            onSave={save}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {mode && mode !== "off" && personas.length > 0 && (
              <Bars items={items} />
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                onClick={() => {
                  setNote("");
                  setEditing(true);
                }}
                disabled={locked}
              >
                <Pencil aria-hidden />
                Edit quiz
              </Button>
              {mode === "off" ? (
                <Button
                  onClick={() =>
                    go(
                      "on",
                      "/api/admin/quiz",
                      { action: "on" },
                      null,
                      `Quiz turned on with ${kept}.`,
                    )
                  }
                  disabled={locked}
                >
                  <Power aria-hidden />
                  Turn quiz on
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    go(
                      "off",
                      "/api/admin/quiz",
                      { action: "off" },
                      `Turn the quiz off? ${CLEARS} You can turn it on again.`,
                      "Quiz turned off. Phones hide the Quiz tab.",
                    )
                  }
                  disabled={locked}
                >
                  <PowerOff aria-hidden />
                  Turn quiz off
                </Button>
              )}
            </div>
            {quiz?.saved && (
              <Button
                onClick={() =>
                  go(
                    "starter",
                    "/api/admin/quiz",
                    { action: "starter" },
                    `Restore the starter quiz? This replaces your custom quiz. ${CLEARS}`,
                    "Starter quiz restored.",
                  )
                }
                disabled={locked}
              >
                <Undo2 aria-hidden />
                Restore starter quiz
              </Button>
            )}
            {mode !== "off" && (
              <Button
                variant="danger"
                onClick={() =>
                  go(
                    "reset",
                    "/api/admin/reset-quiz",
                    {},
                    "Reset the quiz tally? All quiz answers go to 0.",
                    "Quiz tally reset.",
                  )
                }
                disabled={locked}
              >
                <RotateCcw aria-hidden />
                Reset quiz tally
              </Button>
            )}
            {error && <ErrorText>{error}</ErrorText>}
          </>
        )}
        <p
          role="status"
          className="text-sm font-medium text-green empty:hidden"
        >
          {note}
        </p>
      </div>
    </Section>
  );
}

interface Draft {
  personas: { id: number; name: string }[];
  // Answers are keyed by persona id, so renaming a persona keeps them.
  questions: { id: number; text: string; answers: Record<number, string> }[];
}

let lastId = 0;
const newId = () => ++lastId;

function toDraft(quiz: Quiz): Draft {
  const personas = quiz.personas.map((name) => ({ id: newId(), name }));
  const questions = quiz.questions.map((q) => ({
    id: newId(),
    text: q.question,
    answers: Object.fromEntries(
      personas.map((p) => [p.id, q.answers[p.name] ?? ""]),
    ),
  }));
  return { personas, questions };
}

function fromDraft({ personas, questions }: Draft): Quiz {
  return {
    personas: personas.map((p) => p.name.trim()),
    questions: questions.map((q) => ({
      question: q.text,
      answers: Object.fromEntries(
        personas.map((p) => [p.name.trim(), q.answers[p.id] ?? ""]),
      ),
    })),
  };
}

/** Inline quiz form: 2 to 6 personas, 1 to 8 questions, an answer each. */
function QuizEditor({
  initial,
  off,
  onSave,
  onCancel,
}: {
  initial: Quiz;
  off: boolean;
  onSave: (quiz: Quiz) => Promise<ApiResult>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => toDraft(initial));
  const { busy, error, run } = useAction();
  const { personas, questions } = draft;
  // Element id to focus after a remove, once the row is gone from the DOM.
  const focusNext = useRef<string | null>(null);

  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });

  function removePersona(i: number) {
    const next = personas[i + 1];
    focusNext.current = next ? `persona-${next.id}` : "add-persona";
    setDraft((d) => ({
      ...d,
      personas: d.personas.filter((x) => x.id !== personas[i].id),
    }));
  }

  function removeQuestion(i: number) {
    const next = questions[i + 1];
    focusNext.current = next ? `question-${next.id}` : "add-question";
    setDraft((d) => ({
      ...d,
      questions: d.questions.filter((x) => x.id !== questions[i].id),
    }));
  }

  const setPersona = (id: number, name: string) =>
    setDraft((d) => ({
      ...d,
      personas: d.personas.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  const setQuestion = (id: number, patch: Partial<Draft["questions"][0]>) =>
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ask = off
      ? "Save this quiz and turn the quiz on? Saving clears the current quiz answers and tally."
      : "Save this quiz? Saving clears the current quiz answers and tally.";
    if (!window.confirm(ask)) return;
    await run(
      "save",
      () => onSave(fromDraft(draft)),
      "Could not save. Try again.",
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 border-t border-line pt-4">
      <fieldset className="grid gap-2">
        <legend className="float-left mb-1 w-full font-semibold">
          Personas
        </legend>
        <p className="text-sm text-muted">
          {MIN_PERSONAS} to {MAX_PERSONAS}. Each question has one answer per
          persona. A phone gets the persona it picks most often.
        </p>
        {personas.map((p, i) => (
          <div key={p.id} className="flex gap-2">
            <label htmlFor={`persona-${p.id}`} className="sr-only">
              Persona {i + 1}
            </label>
            <input
              id={`persona-${p.id}`}
              required
              maxLength={MAX_PERSONA}
              autoComplete="off"
              value={p.name}
              onChange={(e) => setPersona(p.id, e.target.value)}
              className={FIELD}
            />
            <Button
              aria-label={`Remove persona ${i + 1}`}
              title="Remove persona"
              onClick={() => removePersona(i)}
              disabled={personas.length <= MIN_PERSONAS}
              className="w-12 shrink-0 px-0"
            >
              <X aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          id="add-persona"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              personas: [...d.personas, { id: newId(), name: "" }],
            }))
          }
          disabled={personas.length >= MAX_PERSONAS}
        >
          <Plus aria-hidden />
          Add persona
        </Button>
      </fieldset>

      {questions.map((q, i) => (
        <fieldset
          key={q.id}
          className="relative grid gap-3 border-t border-line pt-4"
        >
          {/* Button beside, not inside, the legend: the group name stays short. */}
          <legend className="float-left flex min-h-12 w-[calc(100%-3.5rem)] items-center font-semibold">
            Question {i + 1}
          </legend>
          <Button
            aria-label={`Remove question ${i + 1}`}
            title="Remove question"
            onClick={() => removeQuestion(i)}
            disabled={questions.length <= 1}
            className="absolute top-4 right-0 w-12 px-0"
          >
            <X aria-hidden />
          </Button>
          <div className="grid gap-1.5">
            <label htmlFor={`question-${q.id}`} className="text-sm">
              Question
            </label>
            <textarea
              id={`question-${q.id}`}
              required
              maxLength={MAX_QUIZ_QUESTION}
              rows={2}
              value={q.text}
              onChange={(e) => setQuestion(q.id, { text: e.target.value })}
              className={`${FIELD} py-2.5 leading-relaxed`}
            />
          </div>
          {personas.map((p, j) => (
            <div key={p.id} className="grid gap-1.5">
              <label
                htmlFor={`answer-${q.id}-${p.id}`}
                className="text-sm wrap-anywhere"
              >
                Answer for {p.name.trim() || `persona ${j + 1}`}
              </label>
              <input
                id={`answer-${q.id}-${p.id}`}
                required
                maxLength={MAX_ANSWER}
                autoComplete="off"
                value={q.answers[p.id] ?? ""}
                onChange={(e) =>
                  setQuestion(q.id, {
                    answers: { ...q.answers, [p.id]: e.target.value },
                  })
                }
                className={FIELD}
              />
            </div>
          ))}
        </fieldset>
      ))}
      <Button
        id="add-question"
        onClick={() =>
          setDraft((d) => ({
            ...d,
            questions: [...d.questions, { id: newId(), text: "", answers: {} }],
          }))
        }
        disabled={questions.length >= MAX_QUIZ_QUESTIONS}
      >
        <Plus aria-hidden />
        Add question
      </Button>

      {error && <ErrorText>{error}</ErrorText>}
      <div className="grid grid-cols-2 gap-2 border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={busy !== null}>
          {busy ? "Saving quiz..." : "Save quiz"}
        </Button>
        <Button onClick={onCancel} disabled={busy !== null}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
