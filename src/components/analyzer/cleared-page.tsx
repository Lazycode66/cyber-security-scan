import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCleared } from "@/lib/allowlist";
import { useScanHistory } from "@/lib/history";

function when(at: number) {
  const mins = Math.round((Date.now() - at) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function ClearedPage() {
  const { entries, ready, hosts, mark, unmark, clearAll } = useCleared();
  const { records } = useScanHistory();
  const [manual, setManual] = useState("");

  /** Flagged scans that are not cleared yet — candidates for a false positive. */
  const candidates = useMemo(
    () =>
      records
        .filter((r) => r.level !== "low" && r.hosts.length > 0)
        .filter((r) => !hosts.has(r.hosts[0] as string))
        .filter(
          (r, i, all) =>
            all.findIndex((o) => o.hosts[0] === r.hosts[0]) === i,
        )
        .slice(0, 8),
    [records, hosts],
  );

  function addManual() {
    const raw = manual.trim().toLowerCase();
    if (!raw) return;
    let host = raw;
    try {
      host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
    } catch {
      /* use the raw value */
    }
    if (!host) return;
    mark({
      host,
      originalLevel: "medium",
      originalScore: 0,
      headline: "Added by hand from the Cleared page.",
    });
    setManual("");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl">
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-accent uppercase">
          // false positives · this device
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight font-semibold tracking-tight text-glow sm:text-5xl">
          Sites you know are safe.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Real websites sometimes trip a warning. Anything you mark here stops
          being flagged on future scans. Remove it any time and the full check
          comes back.
        </p>
      </header>

      <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
        <label
          htmlFor="cleared-add"
          className="font-mono text-[10px] tracking-[0.18em] text-subtle uppercase"
        >
          add an address
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="cleared-add"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addManual();
              }
            }}
            placeholder="example.com"
            className="font-mono"
          />
          <Button type="button" onClick={addManual} disabled={!manual.trim()}>
            Mark as safe
          </Button>
        </div>
      </div>

      {candidates.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">
            recently flagged — was one of these actually fine?
          </h2>
          <ul className="flex flex-col gap-2">
            {candidates.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]"
              >
                <Badge variant={r.level}>
                  {r.level === "high" ? "High risk" : "Medium risk"}
                </Badge>
                <span className="font-mono text-xs break-all text-muted">
                  {r.hosts[0]}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() =>
                    mark({
                      host: r.hosts[0] as string,
                      originalLevel: r.level,
                      originalScore: r.score,
                      headline: r.headline,
                    })
                  }
                >
                  Not phishing
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {entries.length > 0 ? (
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-wide text-subtle uppercase">
            {entries.length} cleared
          </p>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Remove all
          </Button>
        </div>
      ) : null}

      {!ready ? null : entries.length === 0 ? (
        <div className="rounded-xl bg-surface px-5 py-12 text-center shadow-[var(--shadow-border)] sm:px-8">
          <ShieldCheck className="mx-auto size-8 text-subtle" aria-hidden="true" />
          <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">
            Nothing cleared yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            When a site you trust gets flagged, use “mark false positive” on the
            result and it will appear here.
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
          {entries.map((e) => (
            <li
              key={e.id}
              className="rise-in rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="low">Cleared</Badge>
                <span className="font-mono text-sm break-all text-fg">
                  {e.host}
                </span>
                <span className="ml-auto font-mono text-xs text-subtle">
                  {when(e.at)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Originally scored {e.originalScore} ({e.originalLevel} risk):{" "}
                {e.headline}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => unmark(e.host)}
              >
                <Undo2 className="mr-2 size-3.5" aria-hidden="true" />
                Restore warnings
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
