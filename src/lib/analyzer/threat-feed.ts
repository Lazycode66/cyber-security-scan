import { createServerFn } from "@tanstack/react-start";

const UA = "SentinelAwareness/1.0 (educational)";

export type FeedPhishingDomain = {
  hostname: string;
  url: string;
  firstSeen?: string | undefined;
  vendorHits?: number | undefined;
  vendorTotal?: number | undefined;
  googleThreats?: string[] | undefined;
  categories?: string[] | undefined;
};

export type FeedMalwareHash = {
  sha256: string;
  family: string;
  fileType: string;
  firstSeen: string;
  vendorHits?: number | undefined;
  vendorTotal?: number | undefined;
  label?: string | undefined;
};

export type FeedKit = {
  name: string;
  count: number;
  note: string;
};

export type ThreatFeed = {
  fetchedAt: number;
  phishing: FeedPhishingDomain[];
  hashes: FeedMalwareHash[];
  kits: FeedKit[];
  sources: string[];
  notes: string[];
};

async function withTimeout<T>(
  ms: number,
  fn: (signal: AbortSignal) => Promise<T>,
  fallback: T,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fn(ctrl.signal);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

function hostOf(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

async function openphish(signal: AbortSignal): Promise<FeedPhishingDomain[]> {
  const res = await fetch("https://openphish.com/feed.txt", {
    signal,
    redirect: "follow",
    headers: { Accept: "text/plain", "User-Agent": UA },
  });
  if (!res.ok) return [];
  const lines = (await res.text()).split("\n").map((l) => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: FeedPhishingDomain[] = [];
  for (const url of lines) {
    const hostname = hostOf(url);
    if (!hostname || seen.has(hostname)) continue;
    seen.add(hostname);
    out.push({ hostname, url });
    if (out.length >= 12) break;
  }
  return out;
}

async function sinkingRecent(signal: AbortSignal): Promise<string[]> {
  const res = await fetch("https://phish.sinking.yachts/v2/recent/86400", {
    signal,
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { type?: string; domains?: string[] }[];
  const out: string[] = [];
  for (const entry of body ?? []) {
    if (entry.type && entry.type !== "add") continue;
    for (const d of entry.domains ?? []) {
      const host = String(d).toLowerCase();
      if (host && !out.includes(host)) out.push(host);
    }
  }
  return out.slice(0, 8);
}

async function malwareBazaar(signal: AbortSignal): Promise<FeedMalwareHash[]> {
  const res = await fetch("https://bazaar.abuse.ch/export/csv/recent/", {
    signal,
    headers: { Accept: "text/csv", "User-Agent": UA },
  });
  if (!res.ok) return [];
  const text = await res.text();
  const rows = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  const out: FeedMalwareHash[] = [];
  for (const row of rows) {
    const cols = row
      .split('", "')
      .map((c) => c.replace(/^"|"$/g, "").trim());
    const firstSeen = cols[0];
    const sha256 = cols[1];
    const fileType = cols[6];
    const family = cols[8];
    if (!sha256 || !/^[a-f0-9]{64}$/i.test(sha256)) continue;
    out.push({
      sha256,
      family: family && family !== "n/a" ? family : "unattributed",
      fileType: fileType && fileType !== "n/a" ? fileType : "unknown",
      firstSeen: firstSeen ?? "",
    });
    if (out.length >= 40) break;
  }
  return out;
}

async function vtDomain(hostname: string, key: string, signal: AbortSignal) {
  const res = await fetch(
    `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(hostname)}`,
    { signal, headers: { "x-apikey": key, Accept: "application/json" } },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as {
    data?: {
      attributes?: {
        last_analysis_stats?: Record<string, number>;
        categories?: Record<string, string>;
      };
    };
  };
  const stats = body.data?.attributes?.last_analysis_stats ?? {};
  const malicious = stats["malicious"] ?? 0;
  const suspicious = stats["suspicious"] ?? 0;
  const total =
    malicious + suspicious + (stats["harmless"] ?? 0) + (stats["undetected"] ?? 0);
  return {
    vendorHits: malicious + suspicious,
    vendorTotal: total,
    categories: Array.from(
      new Set(Object.values(body.data?.attributes?.categories ?? {})),
    ).slice(0, 3),
  };
}

async function vtFile(sha256: string, key: string, signal: AbortSignal) {
  const res = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
    signal,
    headers: { "x-apikey": key, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    data?: {
      attributes?: {
        last_analysis_stats?: Record<string, number>;
        popular_threat_classification?: { suggested_threat_label?: string };
      };
    };
  };
  const stats = body.data?.attributes?.last_analysis_stats ?? {};
  const malicious = (stats["malicious"] ?? 0) + (stats["suspicious"] ?? 0);
  const total =
    malicious + (stats["harmless"] ?? 0) + (stats["undetected"] ?? 0);
  return {
    vendorHits: malicious,
    vendorTotal: total,
    label: body.data?.attributes?.popular_threat_classification
      ?.suggested_threat_label,
  };
}

async function safeBrowsing(urls: string[], signal: AbortSignal) {
  const key =
    process.env["GOOGLE_SAFE_BROWSING_API_KEY"] || process.env["GOOGLE_API_KEY"];
  if (!key || urls.length === 0) return null;
  const res = await fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client: { clientId: "sentinel-scanner", clientVersion: "1.0.0" },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION",
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: urls.slice(0, 20).map((url) => ({ url })),
        },
      }),
    },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as {
    matches?: { threatType?: string; threat?: { url?: string } }[];
  };
  const map: Record<string, string[]> = {};
  for (const m of body.matches ?? []) {
    const host = hostOf(m.threat?.url ?? "") || (m.threat?.url ?? "");
    const label = (m.threatType ?? "threat").toLowerCase().replace(/_/g, " ");
    const list = map[host] ?? [];
    if (!list.includes(label)) list.push(label);
    map[host] = list;
  }
  return map;
}

export const lookupThreatFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<ThreatFeed> => {
    const notes: string[] = [];
    const vtKey = process.env["VIRUSTOTAL_API_KEY"];

    const [phishRaw, sinking, hashesRaw] = await Promise.all([
      withTimeout(8000, openphish, [] as FeedPhishingDomain[]),
      withTimeout(6000, sinkingRecent, [] as string[]),
      withTimeout(9000, malwareBazaar, [] as FeedMalwareHash[]),
    ]);

    const phishing: FeedPhishingDomain[] = [...phishRaw];
    for (const host of sinking) {
      if (!phishing.some((p) => p.hostname === host)) {
        phishing.push({ hostname: host, url: `http://${host}/` });
      }
    }
    const top = phishing.slice(0, 10);

    if (top.length === 0) notes.push("Live phishing feeds did not answer this time.");
    if (hashesRaw.length === 0)
      notes.push("The malware sample feed did not answer this time.");

    const gsb = await withTimeout(
      7000,
      (s) => safeBrowsing(top.map((p) => p.url), s),
      null,
    );
    if (gsb) {
      for (const entry of top) {
        const hit = gsb[entry.hostname] ?? gsb[entry.hostname.replace(/^www\./, "")];
        if (hit?.length) entry.googleThreats = hit;
      }
    } else {
      notes.push("Google Safe Browsing did not confirm these entries right now.");
    }

    if (vtKey) {
      await Promise.all(
        top.slice(0, 4).map(async (entry) => {
          const vt = await withTimeout(
            8000,
            (s) => vtDomain(entry.hostname, vtKey, s),
            null,
          );
          if (vt) {
            entry.vendorHits = vt.vendorHits;
            entry.vendorTotal = vt.vendorTotal;
            entry.categories = vt.categories;
          }
        }),
      );
    } else {
      notes.push("Add a VirusTotal key to enrich these entries with vendor counts.");
    }

    const hashes = hashesRaw.slice(0, 8);
    if (vtKey) {
      await Promise.all(
        hashes.slice(0, 3).map(async (h) => {
          const vt = await withTimeout(8000, (s) => vtFile(h.sha256, vtKey, s), null);
          if (vt) {
            h.vendorHits = vt.vendorHits;
            h.vendorTotal = vt.vendorTotal;
            h.label = vt.label;
          }
        }),
      );
    }

    const counts = new Map<string, number>();
    for (const h of hashesRaw) {
      if (h.family === "unattributed") continue;
      counts.set(h.family, (counts.get(h.family) ?? 0) + 1);
    }
    const kits: FeedKit[] = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name,
        count,
        note: `${count} fresh sample${count === 1 ? "" : "s"} attributed to this toolkit in the latest batch.`,
      }));

    return {
      fetchedAt: Date.now(),
      phishing: top,
      hashes,
      kits,
      sources: [
        "OpenPhish live feed",
        "sinking.yachts phishing list",
        "abuse.ch MalwareBazaar",
        "VirusTotal",
        "Google Safe Browsing",
      ],
      notes,
    };
  },
);
