import { useCallback, useEffect, useState } from "react";
import type { Assessment, InputKind, RiskLevel } from "@/lib/analyzer";

const KEY = "sentinel.history.v1";
const LIMIT = 200;
const EVENT = "sentinel:history";

export type ScanRecord = {
  id: string;
  at: number;
  kind: InputKind;
  input: string;
  level: RiskLevel;
  score: number;
  headline: string;
  hosts: string[];
  flags: string[];
  vendorHits: number;
  safeBrowsing: boolean;
};

function isRecord(value: unknown): value is ScanRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<ScanRecord>;
  return typeof r.id === "string" && typeof r.at === "number" && typeof r.score === "number";
}

export function loadHistory(): ScanRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

function write(records: ScanRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(records.slice(0, LIMIT)));
  } catch {
    /* storage full or blocked — history is best effort */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Build a history row from a finished assessment. */
export function toRecord(assessment: Assessment): ScanRecord {
  const hosts = Array.from(
    new Set(assessment.urls.map((u) => u.hostname).filter(Boolean)),
  ).slice(0, 3);
  const vendorHits = (assessment.intel ?? []).reduce(
    (sum, d) =>
      sum + (d.virustotal?.malicious ?? 0) + (d.virustotal?.suspicious ?? 0),
    0,
  );
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    kind: assessment.kind,
    input: assessment.inputPreview.slice(0, 300),
    level: assessment.level,
    score: assessment.score,
    headline: assessment.headline,
    hosts,
    flags: assessment.indicators.slice(0, 3).map((i) => i.title),
    vendorHits,
    safeBrowsing: (assessment.intel ?? []).some(
      (d) => (d.safeBrowsing?.threats?.length ?? 0) > 0,
    ),
  };
}

/** Save a scan, replacing an entry for the same input from the last 5 minutes. */
export function saveScan(assessment: Assessment): ScanRecord {
  const record = toRecord(assessment);
  const existing = loadHistory().filter(
    (r) =>
      !(
        r.kind === record.kind &&
        r.input === record.input &&
        record.at - r.at < 5 * 60_000
      ),
  );
  write([record, ...existing]);
  return record;
}

export function removeScan(id: string) {
  write(loadHistory().filter((r) => r.id !== id));
}

export function clearHistory() {
  write([]);
}

export function useScanHistory() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    setRecords(loadHistory());
    setReady(true);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  return { records, ready, remove: removeScan, clear: clearHistory };
}
