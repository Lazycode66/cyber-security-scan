import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  BookmarkCheck,
  Fingerprint,
  Globe,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { lookupThreatFeed, type ThreatFeed } from "@/lib/analyzer";
import {
  clearWatchlist,
  removeFromWatchlist,
  saveToWatchlist,
  useWatchlist,
  type WatchKind,
} from "@/lib/watchlist";
import { cn } from "@/lib/utils";

export function IntelPage() {
  const [feed, setFeed] = useState<ThreatFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { items } = useWatchlist();
  const saved = new Set(items.map((i) => i.id));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await lookupThreatFeed();
      setFeed(data);
    } catch {
      setError("The live feeds did not answer. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function isSaved(kind: WatchKind, value: string) {
    return saved.has(`${kind}:${value.toLowerCase()}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-accent uppercase">
            // threat intel
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-semibold tracking-tight text-glow sm:text-5xl">
            What is circulating right now.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Fresh phishing domains, malware sample fingerprints, and the toolkits
            behind them — pulled from public feeds and confirmed against
            VirusTotal and Google Safe Browsing. Save anything to your own list;
            it stays on this device.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      {error ? (
        <p className="rounded-lg bg-surface px-4 py-3 text-sm text-risk-high shadow-[var(--shadow-border)]">
          {error}
        </p>
      ) : null}

      {loading && !feed ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : null}

      {feed ? (
        <>
          <Panel
            title="Latest phishing domains"
            icon={<Globe className="size-4 text-subtle" />}
            empty="No live phishing entries came back this time."
            count={feed.phishing.length}
          >
            {feed.phishing.map((p) => (
              <Row
                key={p.hostname}
                primary={p.hostname}
                meta={[
                  p.googleThreats?.length
                    ? `Google: ${p.googleThreats.join(", ")}`
                    : null,
                  p.vendorHits != null
                    ? `${p.vendorHits}/${p.vendorTotal ?? 0} vendors flag it`
                    : null,
                  p.categories?.length ? p.categories.join(", ") : null,
                ]}
                danger
                saved={isSaved("domain", p.hostname)}
                onSave={() =>
                  saveToWatchlist({
                    kind: "domain",
                    value: p.hostname,
                    note: p.googleThreats?.join(", ") || "phishing feed",
                  })
                }
                action={
                  <Link
                    to="/"
                    search={{ sample: undefined }}
                    className="text-xs text-subtle underline-offset-4 hover:text-fg hover:underline"
                  >
                    Scan a link
                  </Link>
                }
              />
            ))}
          </Panel>

          <Panel
            title="Malware hashes"
            icon={<Fingerprint className="size-4 text-subtle" />}
            empty="The malware sample feed did not answer this time."
            count={feed.hashes.length}
          >
            {feed.hashes.map((h) => (
              <Row
                key={h.sha256}
                primary={h.sha256}
                mono
                meta={[
                  h.family,
                  h.fileType,
                  h.firstSeen ? `first seen ${h.firstSeen}` : null,
                  h.vendorHits != null
                    ? `${h.vendorHits}/${h.vendorTotal ?? 0} vendors`
                    : null,
                  h.label ?? null,
                ]}
                danger
                saved={isSaved("hash", h.sha256)}
                onSave={() =>
                  saveToWatchlist({ kind: "hash", value: h.sha256, note: h.family })
                }
              />
            ))}
          </Panel>

          <Panel
            title="Active kits & families"
            icon={<Wrench className="size-4 text-subtle" />}
            empty="No toolkit attribution in the latest batch."
            count={feed.kits.length}
          >
            {feed.kits.map((k) => (
              <Row
                key={k.name}
                primary={k.name}
                meta={[k.note]}
                saved={isSaved("kit", k.name)}
                onSave={() =>
                  saveToWatchlist({ kind: "kit", value: k.name, note: k.note })
                }
              />
            ))}
          </Panel>

          <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="size-4 text-subtle" />
                <h2 className="font-display text-xl font-medium tracking-tight">
                  My list
                </h2>
                <Badge variant="low">{items.length}</Badge>
              </div>
              {items.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => clearWatchlist()}
                >
                  <Trash2 className="size-4" />
                  Clear
                </Button>
              ) : null}
            </div>
            {items.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Nothing saved yet. Use Save on any entry above to keep it here.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg bg-elevated px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs break-all text-fg">
                        {item.value}
                      </p>
                      <p className="mt-1 text-xs text-subtle">
                        {item.kind}
                        {item.note ? ` · ${item.note}` : ""} ·{" "}
                        {new Date(item.at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromWatchlist(item.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs leading-relaxed text-subtle">
            Sources: {feed.sources.join(", ")}. Updated{" "}
            {new Date(feed.fetchedAt).toLocaleTimeString()}.
            {feed.notes.length ? ` ${feed.notes.join(" ")}` : ""} Feeds can lag
            behind brand-new campaigns — never treat an empty list as proof of
            safety.
          </p>
        </>
      ) : null}
    </main>
  );
}

function Panel({
  title,
  icon,
  count,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel-neon rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-7">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl font-medium tracking-tight">
          {title}
        </h2>
        <Badge variant={count > 0 ? "medium" : "low"}>{count}</Badge>
      </div>
      {count === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">{children}</ul>
      )}
    </section>
  );
}

function Row({
  primary,
  meta,
  mono,
  danger,
  saved,
  onSave,
  action,
}: {
  primary: string;
  meta: (string | null | undefined)[];
  mono?: boolean;
  danger?: boolean;
  saved: boolean;
  onSave: () => void;
  action?: React.ReactNode;
}) {
  const details = meta.filter(Boolean).join(" · ");
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg bg-elevated px-4 py-3">
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm break-all",
            mono ? "font-mono text-xs" : "font-mono text-xs",
            danger ? "text-risk-high" : "text-fg",
          )}
        >
          {primary}
        </p>
        {details ? (
          <p className="mt-1 text-xs leading-relaxed text-muted">{details}</p>
        ) : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
      <Button
        type="button"
        variant={saved ? "secondary" : "outline"}
        size="sm"
        className="shrink-0"
        onClick={onSave}
        disabled={saved}
      >
        {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        {saved ? "Saved" : "Save"}
      </Button>
    </li>
  );
}
