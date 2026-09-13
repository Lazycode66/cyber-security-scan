import { SAMPLES } from "@/lib/analyzer";
import { cn } from "@/lib/utils";

export function ExamplesStrip({
  activeId,
  onPick,
}: {
  activeId?: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-wide text-subtle uppercase">
        Try a sample
      </p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {SAMPLES.map((sample) => {
          const active = sample.id === activeId;
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => onPick(sample.id)}
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-sm transition-[background-color,color,box-shadow] duration-[150ms]",
                active
                  ? "bg-accent text-accent-fg"
                  : "bg-elevated text-muted shadow-[var(--shadow-border)] hover:text-fg",
              )}
            >
              {sample.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
