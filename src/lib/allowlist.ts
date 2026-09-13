import { useCallback, useEffect, useState } from "react";
import type { RiskLevel } from "@/lib/analyzer";

const KEY = "sentinel.cleared.v1";
const EVENT = "sentinel:cleared";
const LIMIT = 200;

export type ClearedEntry = {
  id: string;
  host: string;
  at: number;
  /** What the scan said before the user overrode it. */
  originalLevel: RiskLevel;
  originalScore: number;
  headline: string;
  note?: string | undefined;
};

function isEntry(value: unknown): value is ClearedEntry {
  if (!value || typeof value !== "object") return false;
  const e = value as Partial<ClearedEntry>;
  return typeof e.id === "string" && typeof e.host === "string";
}

export function loadCleared(): ClearedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

function write(entries: ClearedEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, LIMIT)));
  } catch {
    /* best effort */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearedHosts(): Set<string> {
  return new Set(loadCleared().map((e) => e.host));
}

export function markFalsePositive(input: {
  host: string;
  originalLevel: RiskLevel;
  originalScore: number;
  headline: string;
  note?: string | undefined;
}): ClearedEntry {
  const host = input.host.trim().toLowerCase();
  const entry: ClearedEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    host,
    originalLevel: input.originalLevel,
    originalScore: input.originalScore,
    headline: input.headline,
    note: input.note,
  };
  write([entry, ...loadCleared().filter((e) => e.host !== host)]);
  return entry;
}

export function unmarkFalsePositive(host: string) {
  write(loadCleared().filter((e) => e.host !== host.toLowerCase()));
}

export function clearAllCleared() {
  write([]);
}

export function useCleared() {
  const [entries, setEntries] = useState<ClearedEntry[]>([]);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    setEntries(loadCleared());
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

  return {
    entries,
    ready,
    hosts: new Set(entries.map((e) => e.host)),
    mark: markFalsePositive,
    unmark: unmarkFalsePositive,
    clearAll: clearAllCleared,
  };
}
