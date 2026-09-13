import { createServerFn } from "@tanstack/react-start";
import type {
  Assessment,
  DomainIntel,
  Indicator,
  RiskLevel,
  SafeBrowsingIntel,
  VirusTotalIntel,
} from "./types";

export type IntelResult =
  | { ok: true; domains: DomainIntel[]; indicators: Indicator[] }
  | { ok: false; error: string; domains: DomainIntel[]; indicators: Indicator[] };

const RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
const UA = "SentinelAwareness/1.0 (educational)";

function levelFromScore(score: number, indicators: Indicator[]): RiskLevel {
  if (indicators.some((i) => i.severity === "high" && i.weight >= 28)) {
    return score >= 40 ? "high" : "medium";
  }
  if (score >= 55) return "high";
  if (score >= 24) return "medium";
  return "low";
}

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

function ageDays(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

async function lookupRdap(
  hostname: string,
  signal: AbortSignal,
): Promise<DomainIntel["rdap"]> {
  const isIp = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":");
  const url = isIp
    ? `https://rdap.org/ip/${encodeURIComponent(hostname)}`
    : `https://rdap.org/domain/${encodeURIComponent(hostname)}`;
  const res = await fetch(url, {
    signal,
    redirect: "follow",
    headers: { Accept: "application/rdap+json, application/json", "User-Agent": UA },
  });
  if (res.status === 404) {
    return { ok: true, registrar: "Not in the public registry" };
  }
  if (!res.ok) {
    return { ok: false, error: `RDAP ${res.status}` };
  }
  const body = (await res.json()) as {
    registrar?: string;
    events?: { eventAction?: string; eventDate?: string }[];
    entities?: { roles?: string[]; vcardArray?: unknown[] }[];
    nameservers?: { ldhName?: string }[];
  };
  const created = body.events?.find((e) =>
    /registration|registered/i.test(e.eventAction ?? ""),
  )?.eventDate;
  let registrar = body.registrar;
  if (!registrar && Array.isArray(body.entities)) {
    const reg = body.entities.find((e) => e.roles?.includes("registrar"));
    const vcard = reg?.vcardArray?.[1];
    if (Array.isArray(vcard)) {
      const fn = vcard.find((row) => Array.isArray(row) && row[0] === "fn");
      if (Array.isArray(fn) && typeof fn[3] === "string") registrar = fn[3];
    }
  }
  const nameservers = (body.nameservers ?? [])
    .map((n) => n.ldhName)
    .filter((n): n is string => Boolean(n))
    .slice(0, 4);
  return {
    ok: true,
    registrar,
    created,
    ageDays: ageDays(created),
    nameservers,
  };
}

async function lookupMalware(
  hostname: string,
  signal: AbortSignal,
): Promise<DomainIntel["urlhaus"]> {
  const [phish, scan] = await Promise.all([
    fetch(`https://phish.sinking.yachts/v2/check/${encodeURIComponent(hostname)}`, {
      signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    })
      .then(async (res) => {
        if (!res.ok) return { listed: false as const };
        const text = (await res.text()).trim().toLowerCase();
        return { listed: text === "true" || text === "1" };
      })
      .catch(() => ({ listed: false as const })),
    fetch(
      `https://urlscan.io/api/v1/search/?q=domain:${encodeURIComponent(hostname)}&size=3`,
      { signal, headers: { Accept: "application/json", "User-Agent": UA } },
    )
      .then(async (res) => {
        if (!res.ok) return { listed: false as const, tags: [] as string[] };
        const body = (await res.json()) as {
          results?: {
            page?: { malicious?: boolean };
            verdicts?: { overall?: { malicious?: boolean } };
            task?: { tags?: string[] };
          }[];
        };
        const hits = body.results ?? [];
        const malicious = hits.some(
          (h) => h.page?.malicious || h.verdicts?.overall?.malicious,
        );
        const tags = Array.from(
          new Set(hits.flatMap((h) => h.task?.tags ?? [])),
        ).slice(0, 6);
        return { listed: malicious, tags };
      })
      .catch(() => ({ listed: false as const, tags: [] as string[] })),
  ]);

  const listed = Boolean(phish.listed || scan.listed);
  const tags = "tags" in scan ? scan.tags : [];
  return {
    ok: true,
    listed,
    threat: listed ? (phish.listed ? "phishing list" : "urlscan malicious") : undefined,
    tags,
  };
}

async function lookupDns(
  hostname: string,
  signal: AbortSignal,
): Promise<DomainIntel["dns"]> {
  const res = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`,
    { signal, headers: { Accept: "application/dns-json", "User-Agent": UA } },
  );
  if (!res.ok) return { ok: false, addresses: [], error: `DNS ${res.status}` };
  const body = (await res.json()) as {
    Status?: number;
    Answer?: { type?: number; data?: string }[];
  };
  const addresses = (body.Answer ?? [])
    .filter((a) => a.type === 1 && a.data)
    .map((a) => a.data as string)
    .slice(0, 4);
  return { ok: true, addresses };
}

const GSB_LABEL: Record<string, string> = {
  MALWARE: "malware",
  SOCIAL_ENGINEERING: "phishing / social engineering",
  UNWANTED_SOFTWARE: "unwanted software",
  POTENTIALLY_HARMFUL_APPLICATION: "harmful app",
};

async function lookupVirusTotal(
  hostname: string,
  signal: AbortSignal,
): Promise<VirusTotalIntel> {
  const key = process.env["VIRUSTOTAL_API_KEY"];
  if (!key) return { ok: false, configured: false, error: "No API key" };
  const res = await fetch(
    `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(hostname)}`,
    { signal, headers: { "x-apikey": key, Accept: "application/json" } },
  );
  if (res.status === 404) {
    return { ok: true, configured: true, known: false, total: 0 };
  }
  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      error:
        res.status === 401
          ? "VirusTotal rejected the API key"
          : res.status === 429
            ? "VirusTotal rate limit reached"
            : `VirusTotal ${res.status}`,
    };
  }
  const body = (await res.json()) as {
    data?: {
      attributes?: {
        last_analysis_stats?: Record<string, number>;
        reputation?: number;
        categories?: Record<string, string>;
      };
    };
  };
  const stats = body.data?.attributes?.last_analysis_stats ?? {};
  const malicious = stats["malicious"] ?? 0;
  const suspicious = stats["suspicious"] ?? 0;
  const harmless = stats["harmless"] ?? 0;
  const undetected = stats["undetected"] ?? 0;
  const categories = Array.from(
    new Set(Object.values(body.data?.attributes?.categories ?? {})),
  ).slice(0, 4);
  return {
    ok: true,
    configured: true,
    known: true,
    malicious,
    suspicious,
    harmless,
    undetected,
    total: malicious + suspicious + harmless + undetected,
    reputation: body.data?.attributes?.reputation ?? null,
    categories,
  };
}

type SafeBrowsingBatch = {
  ok: boolean;
  configured: boolean;
  matches: Record<string, string[]>;
  error?: string | undefined;
};

async function lookupSafeBrowsing(
  urls: string[],
  signal: AbortSignal,
): Promise<SafeBrowsingBatch> {
  const key =
    process.env["GOOGLE_SAFE_BROWSING_API_KEY"] || process.env["GOOGLE_API_KEY"];
  if (!key) {
    return { ok: false, configured: false, matches: {}, error: "No API key" };
  }
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
          threatEntries: urls.map((url) => ({ url })),
        },
      }),
    },
  );
  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      matches: {},
      error:
        res.status === 400 || res.status === 403
          ? "Google rejected the Safe Browsing key"
          : `Safe Browsing ${res.status}`,
    };
  }
  const body = (await res.json()) as {
    matches?: { threatType?: string; threat?: { url?: string } }[];
  };
  const matches: Record<string, string[]> = {};
  for (const m of body.matches ?? []) {
    const raw = m.threat?.url ?? "";
    let host = "";
    try {
      host = new URL(raw.includes("://") ? raw : `http://${raw}`).hostname;
    } catch {
      host = raw;
    }
    const label = GSB_LABEL[m.threatType ?? ""] ?? (m.threatType ?? "threat");
    for (const key of new Set([host, host.replace(/^www\./, "")])) {
      const list = matches[key] ?? [];
      if (!list.includes(label)) list.push(label);
      matches[key] = list;
    }
  }
  return { ok: true, configured: true, matches };
}

function indicatorsFrom(domains: DomainIntel[]): Indicator[] {
  const out: Indicator[] = [];
  for (const d of domains) {
    const sbThreats = d.safeBrowsing?.threats ?? [];
    if (sbThreats.length > 0) {
      out.push({
        id: `gsb-${d.hostname}`,
        severity: "high",
        weight: 45,
        title: `Google Safe Browsing flags ${d.hostname}`,
        detail: `Google lists this address for ${sbThreats.join(", ")}. Close the page. Do not enter anything on it, and do not install anything it offers.`,
        category: "phishing",
      });
    }
    const vt = d.virustotal;
    if (vt?.ok && (vt.malicious ?? 0) + (vt.suspicious ?? 0) > 0) {
      const bad = (vt.malicious ?? 0) + (vt.suspicious ?? 0);
      out.push({
        id: `vt-${d.hostname}`,
        severity: bad >= 3 ? "high" : "medium",
        weight: bad >= 3 ? 40 : 20,
        title: `${bad} security vendor${bad === 1 ? "" : "s"} flag ${d.hostname}`,
        detail: `VirusTotal shows ${vt.malicious ?? 0} malicious and ${vt.suspicious ?? 0} suspicious verdicts out of ${vt.total ?? 0} engines${
          vt.categories && vt.categories.length
            ? `, categorised as ${vt.categories.join(", ")}`
            : ""
        }. Treat it as hostile.`,
        category: "phishing",
      });
    }
    if (vt?.ok && vt.known === false) {
      out.push({
        id: `vt-unknown-${d.hostname}`,
        severity: "medium",
        weight: 10,
        title: "No VirusTotal history for this domain",
        detail: `${d.hostname} has never been analysed by VirusTotal. Real banks, brands, and government sites almost always have a record.`,
        category: "phishing",
      });
    }
    if (d.urlhaus.ok && d.urlhaus.listed) {
      out.push({
        id: `intel-list-${d.hostname}`,
        severity: "high",
        weight: 36,
        title: `${d.hostname} appears on a public phishing feed`,
        detail: `A community malware/phishing list flagged this host${
          d.urlhaus.threat ? ` (${d.urlhaus.threat})` : ""
        }. Treat it as hostile until a trusted channel says otherwise.`,
        category: "phishing",
      });
    }
    if (d.rdap.ok && d.rdap.registrar === "Not in the public registry") {
      out.push({
        id: `intel-nx-${d.hostname}`,
        severity: "medium",
        weight: 14,
        title: "Domain is not in the public registry",
        detail: `${d.hostname} has no RDAP record. It may be unregistered, newly dropped, or invented. Do not trust a login page on it.`,
        category: "phishing",
      });
    }
    if (d.rdap.ok && d.rdap.ageDays != null && d.rdap.ageDays <= 14) {
      out.push({
        id: `intel-young-${d.hostname}`,
        severity: "high",
        weight: 22,
        title: "Domain was registered in the last two weeks",
        detail: `${d.hostname} is about ${d.rdap.ageDays} day${
          d.rdap.ageDays === 1 ? "" : "s"
        } old${d.rdap.registrar ? ` (registrar: ${d.rdap.registrar})` : ""}. Brand-new domains are a common phishing tell.`,
        category: "phishing",
      });
    } else if (d.rdap.ok && d.rdap.ageDays != null && d.rdap.ageDays <= 90) {
      out.push({
        id: `intel-recent-${d.hostname}`,
        severity: "medium",
        weight: 12,
        title: "Domain is relatively new",
        detail: `${d.hostname} was registered about ${d.rdap.ageDays} days ago. Banks and governments rarely use a domain that young.`,
        category: "phishing",
      });
    }
    if (d.dns.ok && d.dns.addresses.length === 0) {
      out.push({
        id: `intel-nodns-${d.hostname}`,
        severity: "medium",
        weight: 8,
        title: "No DNS A record",
        detail: `${d.hostname} does not resolve to an IP right now. That is another reason not to tap it.`,
        category: "phishing",
      });
    }
  }
  return out;
}

export const lookupIntel = createServerFn({ method: "POST" })
  .inputValidator((input: { hostnames: string[]; urls?: string[] }) => ({
    hostnames: (input.hostnames ?? [])
      .map((h) => String(h).toLowerCase().replace(/\.$/, "").slice(0, 253))
      .filter(Boolean)
      .slice(0, 2),
    urls: (input.urls ?? [])
      .map((u) => String(u).slice(0, 2000))
      .filter(Boolean)
      .slice(0, 5),
  }))
  .handler(async ({ data }): Promise<IntelResult> => {
    if (data.hostnames.length === 0) {
      return { ok: true, domains: [], indicators: [] };
    }

    const gsbUrls =
      data.urls.length > 0
        ? data.urls
        : data.hostnames.map((h) => `http://${h}/`);
    const safeBrowsing = await withTimeout(
      6000,
      (s) => lookupSafeBrowsing(gsbUrls, s),
      { ok: false, configured: true, matches: {}, error: "timed out" },
    );

    const domains = await Promise.all(
      data.hostnames.map(async (hostname) => {
        const [rdap, urlhaus, dns, virustotal] = await Promise.all([
          withTimeout(6000, (s) => lookupRdap(hostname, s), {
            ok: false,
            error: "timed out",
          }),
          withTimeout(5000, (s) => lookupMalware(hostname, s), {
            ok: false,
            listed: false,
            error: "timed out",
          }),
          withTimeout(4000, (s) => lookupDns(hostname, s), {
            ok: false,
            addresses: [],
            error: "timed out",
          }),
          withTimeout(8000, (s) => lookupVirusTotal(hostname, s), {
            ok: false,
            configured: true,
            error: "timed out",
          } as VirusTotalIntel),
        ]);
        const sb: SafeBrowsingIntel = safeBrowsing.configured
          ? safeBrowsing.ok
            ? { ok: true, configured: true, threats: safeBrowsing.matches[hostname] ?? [] }
            : {
                ok: false,
                configured: true,
                threats: [],
                error: safeBrowsing.error ?? "Unavailable",
              }
          : { ok: false, configured: false, threats: [], error: "No API key" };
        return { hostname, rdap, urlhaus, dns, virustotal, safeBrowsing: sb };
      }),
    );

    return {
      ok: true,
      domains,
      indicators: indicatorsFrom(domains),
    };
  });

export function applyIntel(
  current: Assessment,
  intel: IntelResult,
): Assessment {
  const known = new Set(current.indicators.map((i) => i.id));
  const indicators = [
    ...current.indicators,
    ...intel.indicators.filter((i) => !known.has(i.id)),
  ].sort((a, b) => b.weight - a.weight);
  const score = Math.min(
    100,
    indicators.reduce((sum, i) => sum + i.weight, 0),
  );
  const nextLevel = levelFromScore(score, indicators);
  const level =
    RANK[nextLevel] > RANK[current.level] ? nextLevel : current.level;
  return {
    ...current,
    score,
    level,
    indicators,
    intel: intel.domains,
  };
}
