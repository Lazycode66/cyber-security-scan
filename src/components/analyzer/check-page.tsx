import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ExamplesStrip } from "@/components/analyzer/examples-strip";
import { Intake } from "@/components/analyzer/intake";
import { Results } from "@/components/analyzer/results";
import {
  analyze,
  applyIntel,
  enhanceBriefing,
  getSample,
  lookupIntel,
  type AppDetails,
  type Assessment,
  type InputKind,
} from "@/lib/analyzer";

const EMPTY_APP: AppDetails = {
  name: "",
  source: "unknown",
  permissions: [],
  claimedPurpose: "",
  developer: "",
};

export function CheckPage({ sampleId }: { sampleId?: string }) {
  const navigate = useNavigate();
  const [kind, setKind] = useState<InputKind>("link");
  const [text, setText] = useState("");
  const [app, setApp] = useState<AppDetails>(EMPTY_APP);
  const [scanning, setScanning] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [briefingPending, setBriefingPending] = useState(false);
  const [intelPending, setIntelPending] = useState(false);
  const [briefingNote, setBriefingNote] = useState<string | null>(null);
  const [activeSample, setActiveSample] = useState<string | null>(sampleId ?? null);
  const runId = useRef(0);
  const lastAuto = useRef<string | null>(null);
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

  function applySample(id: string, auto = false) {
    const sample = getSample(id);
    if (!sample) return;
    setActiveSample(id);
    setKind(sample.kind);
    setText(sample.payload.text);
    setApp(sample.payload.app ?? EMPTY_APP);
    if (auto) {
      void runCheck(sample.payload.kind, sample.payload.text, sample.payload.app ?? EMPTY_APP);
    }
  }

  async function runCheck(
    nextKind = kind,
    nextText = text,
    nextApp = app,
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
    setBriefingPending(false);

    const started = Date.now();
    const local = analyze({
      kind: nextKind,
      text: nextKind === "app" ? nextText || nextApp.claimedPurpose : nextText,
      app: nextKind === "app" ? nextApp : undefined,
    });
    const wait = Math.max(0, 700 - (Date.now() - started));
    await new Promise((r) => setTimeout(r, wait));
    if (id !== runId.current) return;
    setAssessment(local);
    setScanning(false);
    setIntelPending(true);
    setBriefingPending(true);
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const hosts = Array.from(
      new Set(local.urls.map((u) => u.registrable || u.hostname).filter(Boolean)),
    ).slice(0, 2);

    const intelPromise =
      hosts.length > 0
        ? lookupIntel({ data: { hostnames: hosts } }).catch(() => null)
        : Promise.resolve(null);

    const briefingPromise = enhanceBriefing({
      data: {
        kind: local.kind,
        input:
          nextKind === "app"
            ? JSON.stringify(nextApp).slice(0, 1500)
            : nextText.slice(0, 1500),
        level: local.level,
        headline: local.headline,
        indicators: local.indicators.slice(0, 8).map((i) => ({
          id: i.id,
          title: i.title,
          detail: i.detail,
        })),
      },
    }).catch(() => null);

    const intel = await intelPromise;
    if (id !== runId.current) return;
    if (intel) {
      setAssessment((current) => (current ? applyIntel(current, intel) : current));
      if (intel.ok && intel.domains.length) {
        setBriefingNote("Live registry, DNS, and malware-list lookups finished.");
      }
    }
    setIntelPending(false);

    const extra = await briefingPromise;
    if (id !== runId.current) return;
    if (extra && extra.ok) {
      setAssessment((current) => {
        if (!current) return current;
        const known = new Set(current.indicators.map((i) => i.title.toLowerCase()));
        const mergedIndicators = [
          ...current.indicators,
          ...extra.indicators.filter(
            (i) => i.detail && !known.has(i.title.toLowerCase()),
          ),
        ];
        return {
          ...current,
          level: extra.level,
          summary: extra.summary || current.summary,
          indicators: mergedIndicators,
          steps: extra.steps.length ? extra.steps : current.steps,
        };
      });
      setBriefingNote((note) =>
        note
          ? `${note} Briefing expanded with a second read.`
          : "Briefing expanded with a second read.",
      );
    }
    setBriefingPending(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">
          Awareness desk
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
          Check it before you tap.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Paste a suspicious link, message, or app. Lantern names the patterns —
          phishing, digital-arrest scripts, greedy permissions — then checks the
          domain against live registry, DNS, and public malware lists.
        </p>
      </header>

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
          void navigate({ to: "/", search: {} });
          void runCheck();
        }}
      />

      <ExamplesStrip
        activeId={activeSample}
        onPick={(id) => {
          lastAuto.current = id;
          void navigate({ to: "/", search: { sample: id } });
          applySample(id, true);
        }}
      />

      <div ref={resultsRef} className="scroll-mt-20">
        <Results
          assessment={assessment}
          scanning={scanning}
          briefingPending={briefingPending}
          intelPending={intelPending}
          briefingNote={briefingNote}
        />
      </div>
    </main>
  );
}
