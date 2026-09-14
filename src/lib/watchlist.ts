import { useCallback, useEffect, useState } from "react";

const KEY = "sentinel.watchlist.v1";
const EVENT = "sentinel:watchlist";
const LIMIT = 300;

export type WatchKind = "domain" | "hash" | "kit";

export type WatchItem = {
  id: string;
  kind: WatchKind;
  value: string;
  note?: string | undefined;
  at: number;
};

function isItem(value: unknown): value is WatchItem {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<WatchItem>;
  return typeof r.id === "string" && typeof r.value === "string";
}

export function loadWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isItem).sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

function write(items: WatchItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, LIMIT)));
  } catch {
    /* best effort */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function saveToWatchlist(item: {
  kind: WatchKind;
  value: string;
  note?: string | undefined;
}) {
  const value = item.value.trim();
  if (!value) return;
  const id = `${item.kind}:${value.toLowerCase()}`;
  const existing = loadWatchlist().filter((w) => w.id !== id);
  write([{ id, kind: item.kind, value, note: item.note, at: Date.now() }, ...existing]);
}

export function removeFromWatchlist(id: string) {
  write(loadWatchlist().filter((w) => w.id !== id));
}

export function clearWatchlist() {
  write([]);
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchItem[]>([]);

  const refresh = useCallback(() => setItems(loadWatchlist()), []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  return { items, refresh };
}
