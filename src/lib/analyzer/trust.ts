import type { Assessment, DomainIntel, Indicator, RiskLevel } from "./types";

/**
 * Heuristic flags that are only suggestive. When live intelligence says the
 * domain is clean, established, and well known, these alone must not be enough
 * to call a real website phishing.
 */
const SOFT_PREFIXES = [
  "tld-",
  "bait-",
  "subs-",
  "freehost-",
  "short-",
  "lookalike-",
  "vt-unknown-",
  "intel-recent-",
  "intel-nodns-",
  "http-",
];

const SOFT_IDS = new Set(["cta-unofficial"]);

function isSoft(indicator: Indicator) {
  return (
    SOFT_IDS.has(indicator.id) ||
    SOFT_PREFIXES.some((p) => indicator.id.startsWith(p))
  );
}

/** Live evidence that a hostname is a real, long-standing, clean site. */
export function looksReputable(domain: DomainIntel): boolean {
  const vt = domain.virustotal;
  const sb = domain.safeBrowsing;

  const safeBrowsingClean = Boolean(sb?.ok && sb.threats.length === 0);
  const vtClean = Boolean(
    vt?.ok &&
      vt.known !== false &&
      (vt.malicious ?? 0) === 0 &&
      (vt.suspicious ?? 0) === 0 &&
      (vt.harmless ?? 0) >= 5,
  );
  const notListed = !(domain.urlhaus.ok && domain.urlhaus.listed);
  // Registry lookups fail often (rate limits, unsupported TLDs). When RDAP is
  // simply unavailable, a strong VirusTotal record is enough of a substitute.
  const established =
    (domain.rdap.ok && (domain.rdap.ageDays ?? 0) >= 365) ||
    (!domain.rdap.ok && (vt?.harmless ?? 0) >= 30);
  const resolves = domain.dns.ok && domain.dns.addresses.length > 0;

  return (
    safeBrowsingClean && vtClean && notListed && established && resolves
  );
}

function levelFor(score: number, indicators: Indicator[]): RiskLevel {
  if (indicators.some((i) => i.severity === "high" && i.weight >= 28)) {
    return score >= 40 ? "high" : "medium";
  }
  if (score >= 55) return "high";
  if (score >= 24) return "medium";
  return "low";
}

function rebuild(assessment: Assessment, indicators: Indicator[]): Assessment {
  const sorted = indicators.slice().sort((a, b) => b.weight - a.weight);
  const score = Math.min(
    100,
    sorted.reduce((sum, i) => sum + i.weight, 0),
  );
  return {
    ...assessment,
    indicators: sorted,
    score,
    level: levelFor(score, sorted),
  };
}

/**
 * Down-weight guesswork when every checked domain comes back clean from
 * Google Safe Browsing, VirusTotal, the registry, and DNS.
 */
export function softenWithEvidence(assessment: Assessment): Assessment {
  const domains = assessment.intel ?? [];
  if (domains.length === 0) return assessment;
  if (!domains.every(looksReputable)) return assessment;

  const softened = assessment.indicators.map((indicator) =>
    isSoft(indicator)
      ? {
          ...indicator,
          severity: "low" as RiskLevel,
          weight: 0,
          detail: `${indicator.detail} Live checks came back clean for this domain, so this is context only — not a phishing verdict.`,
        }
      : indicator,
  );

  const next = rebuild(assessment, softened);
  if (next.level !== "low") return next;
  return {
    ...next,
    headline: "Checks came back clean.",
    summary:
      "Google Safe Browsing and VirusTotal know this domain and report no threats, the registration is well established, and it resolves normally. Nothing here matches a phishing pattern — still avoid entering codes or payments you were not expecting.",
  };
}

/** Force a result to low risk because the user marked it as a false positive. */
export function applyClearedHosts(
  assessment: Assessment,
  cleared: Set<string>,
): Assessment {
  if (cleared.size === 0) return assessment;
  const hosts = assessment.urls.map((u) => u.hostname).filter(Boolean);
  if (hosts.length === 0 || !hosts.every((h) => cleared.has(h))) {
    return assessment;
  }
  const indicators = assessment.indicators.map((i) => ({ ...i, weight: 0 }));
  return {
    ...assessment,
    indicators,
    score: 0,
    level: "low",
    headline: "You marked this one as safe.",
    summary:
      "This address is on your cleared list, so the warning is suppressed. Remove it from the Cleared page if you ever want the full scan back.",
  };
}
