import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QUIZ } from "@/lib/analyzer/hub";
import { cn } from "@/lib/utils";

export function Quiz() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const explainRef = useRef<HTMLDivElement>(null);

  const question = QUIZ[index]!;
  const chosen = question.options.find((o) => o.id === picked);
  const answered = picked !== null;
  const progress = done
    ? 100
    : Math.round(((index + (answered ? 1 : 0)) / QUIZ.length) * 100);

  useEffect(() => {
    if (!answered && !done) return;
    explainRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [answered, done, index]);

  function pick(id: string) {
    if (answered) return;
    setPicked(id);
    const option = question.options.find((o) => o.id === id);
    if (option?.correct) setCorrectCount((n) => n + 1);
  }

  function next() {
    if (index + 1 >= QUIZ.length) {
      setDone(true);
      return;
    }
    setIndex((n) => n + 1);
    setPicked(null);
  }

  function reset() {
    setIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setDone(false);
  }

  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">
          Spot the trap
        </p>
        <span className="font-mono text-xs text-subtle tabular-nums">
          {done ? "Done" : `${index + 1}/${QUIZ.length}`}
        </span>
      </div>
      <Progress value={progress} className="mt-3" />
      {done ? (
        <div ref={explainRef} className="mt-4">
          <h2 className="font-display text-3xl font-medium tracking-tight">
            {correctCount} of {QUIZ.length} read correctly
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            This is practice, not a certificate. The useful habit is slowing
            down when money, police, or a login appears in a surprise message.
          </p>
          <Button type="button" variant="secondary" className="mt-6 min-h-11" onClick={reset}>
            Try the questions again
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
            {question.prompt}
          </h2>
          <div className="mt-5 flex flex-col gap-2">
            {question.options.map((option) => {
              const selected = picked === option.id;
              const show = answered;
              const good = option.correct;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => pick(option.id)}
                  className={cn(
                    "min-h-12 rounded-lg px-4 py-3 text-left text-sm leading-snug transition-[background-color,box-shadow,color] duration-[150ms]",
                    !show && "bg-elevated text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
                    show && good && "bg-risk-low text-risk-low-fg",
                    show && selected && !good && "bg-risk-high text-risk-high-fg",
                    show && !selected && !good && "bg-elevated text-muted",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {answered && chosen ? (
            <div ref={explainRef} className="rise-in mt-5">
              <p className="text-sm leading-relaxed text-muted">{question.why}</p>
              <Button type="button" className="mt-4 min-h-11" onClick={next}>
                {index + 1 >= QUIZ.length ? "See how you did" : "Next question"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
