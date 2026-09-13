import { type NormalizedUrl } from "./types";

const MULTI_TLDS = new Set([
  "co.uk",
  "com.au",
  "co.in",
  "com.br",
  "co.jp",
  "com.mx",
  "co.za",
  "com.tr",
  "co.kr",
  "com.sg",
  "org.in",
  "gov.in",
  "net.in",
  "ac.uk",
  "gov.uk",
  "com.cn",
  "co.nz",
  "com.hk",
]);

const URL_RE =
  /((?:https?|ftp|hxxp|hxxps):\/\/[^\s<>"']+|(?:www\.)[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>"']*)?)/gi;

const BARE_DOMAIN_RE =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:xn--[a-z0-9]+|[a-z]{2,24})(?::\d{2,5})?(?:\/[^\s<>"']*)?/gi;

export function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  const last2 = parts.slice(-2).join(".");
  if (MULTI_TLDS.has(last2)) return parts.slice(-3).join(".");
  return last2;
}

export function isIpHost(hostname: string): boolean {
  if (/^\[?[0-9a-f:]+\]?$/i.test(hostname) && hostname.includes(":")) return true;
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function defang(raw: string): string {
  return raw
    .replace(/hxxps?:\/\//gi, (m) =>
      m.toLowerCase().startsWith("hxxps") ? "https://" : "http://",
    )
    .replace(/\[\.\]/g, ".")
    .replace(/\(dot\)/gi, ".");
}

export function parseUrl(raw: string): NormalizedUrl | null {
  const cleaned = defang(raw.trim()).replace(/[),.;!?]+$/g, "");
  if (!cleaned) return null;
  let href = cleaned;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) href = `https://${href}`;
  try {
    const u = new URL(href);
    const hostname = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (!hostname) return null;
    return {
      raw,
      href: u.href,
      protocol: u.protocol.replace(":", ""),
      hostname,
      registrable: registrableDomain(hostname),
      path: `${u.pathname}${u.search}`,
      isIp: isIpHost(hostname),
      isPunycode: hostname.includes("xn--"),
      decodedHost: hostname,
    };
  } catch {
    return null;
  }
}

export function extractUrls(text: string): NormalizedUrl[] {
  const found = new Map<string, NormalizedUrl>();
  const add = (chunk: string) => {
    const parsed = parseUrl(chunk);
    if (!parsed) return;
    if (!found.has(parsed.registrable + parsed.path)) {
      found.set(parsed.registrable + parsed.path, parsed);
    }
  };
  for (const m of text.matchAll(URL_RE)) add(m[0]);
  for (const m of text.matchAll(BARE_DOMAIN_RE)) {
    const token = m[0];
    if (token.includes("@")) continue;
    add(token);
  }
  return [...found.values()];
}

export function decodeRepeated(value: string, times = 3): string {
  let current = value;
  for (let i = 0; i < times; i++) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length]!;
}

export function squashHomoglyphs(value: string): string {
  return value
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/[1l|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/\$/g, "s")
    .replace(/@/g, "a")
    .replace(/rn/g, "m");
}
