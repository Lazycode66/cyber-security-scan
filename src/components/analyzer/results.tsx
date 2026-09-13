import {
  Ban,
  CircleAlert,
  FileSearch,
  Globe,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Assessment, DomainIntel, RiskLevel } from "@/lib/analyzer";
import { cn } from "@/lib/utils";

const LEVEL_COPY: Record<
  RiskLevel,
  { label: string; variant: "low" | "medium" | "high"; Icon: typeof Ban }
> = {
  high: { label: "High risk", variant: "high", Icon: Ban },
  medium: { label: "Medium risk", variant: "medium", Icon: CircleAlert },
  low: { label: "Low risk", variant: "low", Icon: ShieldCheck },
};

export function Results({
  assessment,
  scanning,
  briefingPending,
  intelPending,
  briefingNote,
}: {
  assessment: Assessment | null;
  scanning: boolean;
  briefingPending: boolean;
  intelPending?: boolean;
  briefingNote?: string | null;
}) {
  if (scanning) return <ScanningState />;
  if (!assessment) return <EmptyState />;

  const tone = LEVEL_COPY[assessment.level];
  const Icon = tone.Icon;

  return (
    <section
      aria-live="polite"
      className="rise-in rounded-xl bg-surface shadow-[var(--shadow-border)]"
    >
      <div className="flex flex-col gap-6 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 inline-flex size-10 items-center justify-center rounded-md",
                assessment.level === "high" && "bg-risk-high text-risk-high-fg",
                assessment.level === "medium" &&
                  "bg-risk-medium text-risk-medium-fg",
                assessment.level === "low" && "bg-risk-low text-risk-low-fg",
              )}
            >
              <Icon className="size-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={tone.variant}>{tone.label}</Badge>
                <span className="font-mono text-xs text-subtle tabular-nums">
                  Score {assessment.score}
                </span>
              </div>
              <h2 className="mt-2 font-display text-2xl leading-snug font-medium tracking-tight sm:text-3xl">
                {assessment.headline}
              </h2>
            </div>
          </div>
        </div>

        <Progress
          value={assessment.score}
          barClassName={cn(
            assessment.level === "high" && "bg-risk-high",
            assessment.level === "medium" && "bg-risk-medium",
            assessment.level === "low" && "bg-risk-low",
          )}
        />

        <p className="max-w-2xl text-base leading-relaxed text-muted">
          {assessment.summary}
        </p>
        {briefingPending || intelPending ? (
          <p className="text-xs text-subtle pulse-soft">
            {intelPending
              ? "Querying registry, DNS, and public malware lists…"
              : "Writing a calmer briefing…"}
          </p>
        ) : briefingNote ? (
          <p className="text-xs text-subtle">{briefingNote}</p>
        ) : null}

        {assessment.urls.length > 0 ? (
          <div className="rounded-lg bg-elevated px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-subtle uppercase">
              Address we read
            </p>
            <ul className="mt-2 space-y-1">
              {assessment.urls.slice(0, 3).map((url) => (
                <li
                  key={url.href}
                  className="font-mono text-xs break-all text-fg"
                >
                  {url.hostname}
                  <span className="text-subtle">{url.path}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <LiveIntel domains={assessment.intel} pending={intelPending} />

        <Separator />

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium tracking-wide text-subtle uppercase">
              Why it looks this way
            </h3>
            {assessment.indicators.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No strong pattern matched. Absence of flags is not a certificate
                of safety.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {assessment.indicators.map((item, index) => (
                  <li
                    key={item.id}
                    className="rise-in rounded-lg bg-elevated p-4"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-fg">{item.title}</p>
                      <Badge variant={item.severity} className="shrink-0">
                        {item.severity}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {item.detail}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium tracking-wide text-subtle uppercase">
              What to do
            </h3>
            <ol className="mt-3 flex flex-col gap-3">
              {assessment.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="font-mono text-xs text-subtle tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-fg">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm">
              <Link
                to="/learn"
                hash="already"
                className="text-fg underline-offset-4 hover:underline"
              >
                Already tapped, paid, or installed? Follow this sequence.
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveIntel({
  domains,
  pending,
}: {
  domains?: DomainIntel[] | undefined;
  pending?: boolean | undefined;
}) {
  if (pending && (!domains || domains.length === 0)) {
    return (
      <div className="rounded-lg bg-elevated px-4 py-3">
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">
          Live intel
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }
  if (!domains || domains.length === 0) return null;

  return (
    <div className="rounded-lg bg-elevated px-4 py-3">
      <div className="flex items-center gap-2">
        <Globe className="size-3.5 text-subtle" />
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">
          Live intel
        </p>
      </div>
      <ul className="mt-3 flex flex-col gap-4">
        {domains.map((d) => (
          <li key={d.hostname}>
            <p className="font-mono text-xs text-fg">{d.hostname}</p>
            <dl className="mt-2 grid gap-2 sm:grid-cols-3">
              <IntelFact
                label="Registry"
                value={
                  d.rdap.ok
                    ? [
                        d.rdap.registrar,
                        d.rdap.ageDays != null
                          ? `${d.rdap.ageDays}d old`
                          : d.rdap.created,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Listed"
                    : d.rdap.error ?? "Unavailable"
                }
                warn={Boolean(d.rdap.ok && d.rdap.ageDays != null && d.rdap.ageDays <= 90)}
              />
              <IntelFact
                label="Malware list"
                value={
                  !d.urlhaus.ok
                    ? d.urlhaus.error ?? "Unavailable"
                    : d.urlhaus.listed
                      ? d.urlhaus.threat || "Listed on a phishing feed"
                      : "Not listed on public phishing feeds"
                }
                warn={d.urlhaus.listed}
              />
              <IntelFact
                label="DNS"
                value={
                  d.dns.ok
                    ? d.dns.addresses.join(", ") || "No A record"
                    : d.dns.error ?? "Unavailable"
                }
              />
            </dl>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-subtle">
        RDAP registry, Google Public DNS, sinking.yachts phishing feed, and
        urlscan.io. These feeds can miss threats and can be delayed. They are
        not a forensic verdict.
      </p>
    </div>
  );
}

function IntelFact({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-subtle uppercase">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-xs leading-relaxed",
          warn ? "text-risk-high" : "text-muted",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl bg-surface px-5 py-12 text-center shadow-[var(--shadow-border)] sm:px-8">
      <ShieldQuestion className="mx-auto size-8 text-subtle" />
      <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">
        Waiting for something to check
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Paste a link, a message, or the details of an app. We will name the
        patterns we see, look up the domain, and tell you what to do — without
        the panic.
      </p>
    </div>
  );
}

function ScanningState() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-7">
      <div className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--color-accent)_16%,transparent),transparent)]" />
      <div className="flex items-center gap-2 text-sm text-muted">
        <FileSearch className="size-4" />
        Reading patterns, then live feeds
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-4 h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}
