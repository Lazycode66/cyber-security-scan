import { Link } from "@tanstack/react-router";
import { History, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useScanHistory, type ScanRecord } from "@/lib/history";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<ScanRecord["kind"], string> = {
  link: "link",
  message: "message",
  app: "app",
};

function when(at: number) {
  const diff = Date.now() - at;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function HistoryPage() {
  const { records, ready, remove, clear } = useScanHistory();

  const high = records.filter((r) => r.level === "high").length;
  const medium = records.filter((r) => r.level === "medium").length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl">
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-accent uppercase">
          // scan log · this device
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight font-semibold tracking-tight text-glow sm:text-5xl">
          Everything you've scanned.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Each scan is kept on this device with its risk score and the reasons
          behind it. Nothing is uploaded, and clearing your browser data clears
          this log.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Scans" value={records.length} />
        <Stat label="High risk" value={high} tone="high" />
        <Stat label="Medium risk" value={medium} tone="medium" />
      </div>

      {records.length > 0 ? (
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-wide text-subtle uppercase">
            newest first
          </p>
          <Button variant="outline" size="sm" onClick={clear}>
            <Trash2 className="mr-2 size-3.5" aria-hidden="true" />
            Clear log
          </Button>
        </div>
      ) : null}

      {!ready ? null : records.length === 0 ? (
        <div className="rounded-xl bg-surface px-5 py-12 text-center shadow-[var(--shadow-border)] sm:px-8">
          <History className="mx-auto size-8 text-subtle" aria-hidden="true" />
          <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">
            No scans yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Paste a suspicious link or message into the scanner. Every scan lands
            here automatically.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
          >
            Open the scanner
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {records.map((r, index) => (
            <li
              key={r.id}
              className={cn(
                "rise-in rounded-xl p-4 sm:p-5",
                r.level === "high"
                  ? "panel-alarm"
                  : r.level === "medium"
                    ? "panel-neon"
                    : "bg-surface shadow-[var(--shadow-border)]",
              )}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.level}>
                  {r.level === "high"
                    ? "High risk"
                    : r.level === "medium"
                      ? "Medium risk"
                      : "Low risk"}
                </Badge>
                <span className="font-mono text-xs text-subtle tabular-nums">
                  Score {r.score}
                </span>
                <span className="font-mono text-[10px] tracking-[0.16em] text-subtle uppercase">
                  {KIND_LABEL[r.kind]}
                </span>
                <span className="ml-auto font-mono text-xs text-subtle">
                  {when(r.at)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  aria-label="Remove this scan"
                  className="rounded-md p-1 text-subtle transition-colors hover:bg-elevated hover:text-fg"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>

              <p className="mt-3 text-sm leading-relaxed font-medium text-fg">
                {r.headline}
              </p>
              <p className="mt-1 font-mono text-xs break-all text-muted">
                {r.hosts.length > 0 ? r.hosts.join(", ") : r.input}
              </p>

              <div className="mt-3 max-w-sm">
                <Progress
                  value={r.score}
                  barClassName={cn(
                    r.level === "high" && "bg-risk-high",
                    r.level === "medium" && "bg-risk-medium",
                    r.level === "low" && "bg-risk-low",
                  )}
                />
              </div>

              {(r.safeBrowsing || r.vendorHits > 0 || r.flags.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.safeBrowsing ? (
                    <span className="rounded-md bg-risk-high px-2 py-1 font-mono text-[10px] tracking-wide text-risk-high-fg uppercase">
                      Safe Browsing hit
                    </span>
                  ) : null}
                  {r.vendorHits > 0 ? (
                    <span className="rounded-md bg-elevated px-2 py-1 font-mono text-[10px] tracking-wide text-risk-high uppercase">
                      {r.vendorHits} vendor flag{r.vendorHits === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {r.flags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-md bg-elevated px-2 py-1 text-[11px] text-muted"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "high" | "medium";
}) {
  return (
    <div className="rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
      <p className="font-mono text-[10px] tracking-[0.18em] text-subtle uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-3xl font-semibold tabular-nums",
          tone === "high" && "text-risk-high",
          tone === "medium" && "text-risk-medium",
        )}
      >
        {value}
      </p>
    </div>
  );
}
