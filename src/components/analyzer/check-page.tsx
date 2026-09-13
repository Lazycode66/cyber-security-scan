import { useEffect, useMemo, useRef, useState } from "react";
import { Radar, ShieldAlert } from "lucide-react";
import { ExamplesStrip } from "@/components/analyzer/examples-strip";
import { Intake } from "@/components/analyzer/intake";
import { Results } from "@/components/analyzer/results";
import {
  analyze,
  applyIntel,
  getSample,
  lookupIntel,
  type AppDetails,
  type Assessment,
  type InputKind,
} from "@/lib/analyzer";
import { saveScan } from "@/lib/history";
import { cn } from "@/lib/utils";

const EMPTY_APP: AppDetails = {
  name: "",
  source: "unknown",
  permissions: [],
  claimedPurpose: "",
  developer: "",
};

const AUTO_DELAY = 700;

/** Enough signal to be worth an automatic scan (a link, or a real chunk of text). */
function autoScanReady(kind: InputKind, text: string) {
  if (kind === "app") return false;
  const value = text.trim();
  if (value.length < 6) return false;
  if (kind === "link") return /[a-z0-9-]+\.[a-z]{2,}/i.test(value);
  return value.length >= 24;
}

export function CheckPage({ sampleId }: { sampleId?: string | undefined }) {
  const [kind, setKind] = useState<InputKind>("link");
  const [text, setText] = useState("");
  const [app, setApp] = useState<AppDetails>(EMPTY_APP);
  const [scanning, setScanning] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [intelPending, setIntelPending] = useState(false);
  const [briefingNote, setBriefingNote] = useState<string | null>(null);
  const [autoScan, setAutoScan] = useState(true);
  const [autoQueued, setAutoQueued] = useState(false);
  const [activeSample, setActiveSample] = useState<string | null>(sampleId ?? null);
  const runId = useRef(0);
  const lastAuto = useRef<string | null>(null);
  const lastScanned = useRef<string>("");
  const resultsRef = useRef<HTMLDivElement>(null);

  const canRun = useMemo(() => {
    if (kind === "app") return Boolean(app.name.trim() || app.claimedPurpose.trim());
    return text.trim().length > 0;
  }, [kind, text, app]);

  useEffect(() => {
    if (!sampleId || lastAuto.current === sampleId) return;
    lastAuto.current = sampleId;
    applySample(sampleId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleId]);

  // Live watch: as soon as something scannable is typed or pasted, scan it.
  useEffect(() => {
    if (!autoScan) return;
    const signature = `${kind}::${text.trim()}`;
    if (!autoScanReady(kind, text) || lastScanned.current === signature) {
      setAutoQueued(false);
      return;
    }
    setAutoQueued(true);
    const timer = setTimeout(() => {
      lastScanned.current = signature;
      setAutoQueued(false);
      void runCheck(kind, text, app, { scroll: false });
    }, AUTO_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan, kind, text]);

  function applySample(id: string, auto = false) {
    const sample = getSample(id);
    if (!sample) return;
    setActiveSample(id);
    setKind(sample.kind);
    setText(sample.payload.text);
    setApp(sample.payload.app ?? EMPTY_APP);
    lastScanned.current = `${sample.payload.kind}::${sample.payload.text.trim()}`;
    if (auto) {
      void runCheck(
        sample.payload.kind,
        sample.payload.text,
        sample.payload.app ?? EMPTY_APP,
      );
    }
  }

  async function runCheck(
    nextKind = kind,
    nextText = text,
    nextApp = app,
    options: { scroll?: boolean } = {},
  ) {
    const ready =
      nextKind === "app"
        ? Boolean(nextApp.name.trim() || nextApp.claimedPurpose.trim() || nextText.trim())
        : nextText.trim().length > 0;
    if (!ready) return;

    const id = ++runId.current;
    setScanning(true);
    setBriefingNote(null);
    setAssessment(null);
    setIntelPending(false);

    const started = Date.now();
    const local = analyze({
      kind: nextKind,
      text: nextKind === "app" ? nextText || nextApp.claimedPurpose : nextText,
      app: nextKind === "app" ? nextApp : undefined,
    });
    const wait = Math.max(0, 550 - (Date.now() - started));
    await new Promise((r) => setTimeout(r, wait));
    if (id !== runId.current) return;
    setAssessment(local);
    setScanning(false);
    setIntelPending(true);
    if (options.scroll !== false) {
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    const hosts = Array.from(
      new Set(local.urls.map((u) => u.hostname).filter(Boolean)),
    ).slice(0, 2);
    const urls = Array.from(new Set(local.urls.map((u) => u.href))).slice(0, 5);

    const intel =
      hosts.length > 0
        ? await lookupIntel({ data: { hostnames: hosts, urls } }).catch(() => null)
        : null;
    if (id !== runId.current) return;
    let final = local;
    if (intel) {
      final = applyIntel(local, intel);
      setAssessment(final);
      if (intel.ok && intel.domains.length) {
        const checked = intel.domains[0];
        setBriefingNote(
          checked?.safeBrowsing?.configured
            ? "Checked against Google Safe Browsing, VirusTotal, the registry, DNS, and public phishing feeds."
            : "Checked against VirusTotal, the registry, DNS, and public phishing feeds.",
        );
      }
    }
    setIntelPending(false);
    saveScan(final);
  }

  const alert =
    assessment && !scanning && assessment.level !== "low" ? assessment : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl">
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-accent uppercase">
          // threat desk · live
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight font-semibold tracking-tight text-glow sm:text-5xl">
          Scan it before you tap.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Paste a link, message, or app. The scanner runs the moment it sees
          something worth checking — phishing kits, digital-arrest scripts,
          greedy permissions — then queries live registry, DNS, and public
          malware feeds.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
        <Radar
          className={cn("size-4 text-accent", (autoQueued || scanning) && "pulse-soft")}
          aria-hidden="true"
        />
        <p className="font-mono text-xs tracking-wide text-muted uppercase">
          {autoScan
            ? autoQueued
              ? "auto-scan armed · reading input"
              : scanning
                ? "auto-scan running"
                : "auto-scan on · watching input"
            : "auto-scan off · manual only"}
        </p>
        <button
          type="button"
          onClick={() => setAutoScan((v) => !v)}
          aria-pressed={autoScan}
          className="ml-auto inline-flex h-8 items-center rounded-md border border-border-strong px-3 font-mono text-xs text-fg transition-colors hover:bg-elevated"
        >
          {autoScan ? "Disable" : "Enable"}
        </button>
      </div>

      {alert ? (
        <div
          role="alert"
          aria-live="assertive"
          className={cn(
            "rise-in flex items-start gap-3 rounded-xl px-5 py-4",
            alert.level === "high" ? "panel-alarm alarm-pulse" : "panel-neon",
          )}
        >
          <ShieldAlert
            className={cn(
              "mt-0.5 size-5 shrink-0",
              alert.level === "high" ? "text-risk-high" : "text-risk-medium",
            )}
            aria-hidden="true"
          />
          <div>
            <p className="font-mono text-xs tracking-[0.18em] uppercase text-subtle">
              {alert.level === "high" ? "warning · high risk" : "caution · medium risk"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-fg">
              {alert.headline} Do not enter passwords, OTPs, or payment details
              until you verify through a channel you already trust.
            </p>
          </div>
        </div>
      ) : null}

      <Intake
        kind={kind}
        text={text}
        app={app}
        busy={scanning}
        disabled={!canRun}
        onKind={(next) => {
          setKind(next);
          setActiveSample(null);
        }}
        onText={(next) => {
          setText(next);
          setActiveSample(null);
        }}
        onApp={(next) => {
          setApp(next);
          setActiveSample(null);
        }}
        onSubmit={() => {
          if (!canRun) return;
          lastScanned.current = `${kind}::${text.trim()}`;
          void runCheck();
        }}
      />

      <ExamplesStrip
        activeId={activeSample}
        onPick={(id) => {
          lastAuto.current = id;
          applySample(id, true);
        }}
      />

      <div ref={resultsRef} className="scroll-mt-20">
        <Results
          assessment={assessment}
          scanning={scanning}
          briefingPending={false}
          intelPending={intelPending}
          briefingNote={briefingNote}
        />
      </div>
    </main>
  );
}
