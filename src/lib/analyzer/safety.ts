import type { Assessment, DomainIntel } from "./types";

export type SafetyBand = "safe" | "mostly" | "caution" | "danger";

export type SafetyScore = {
  /** 0 = certainly hostile, 100 = nothing anywhere says this is bad. */
  score: number;
  band: SafetyBand;
  label: string;
  /** Which sources actually answered. */
  google: "clean" | "flagged" | "unavailable" | "not-configured" | "skipped";
  virustotal: "clean" | "flagged" | "unknown" | "unavailable" | "not-configured" | "skipped";
  basis: string[];
};

const LABEL: Record<SafetyBand, string> = {
  safe: "Looks safe",
  mostly: "Mostly clean",
  caution: "Be careful",
  danger: "Dangerous",
};

function band(score: number): SafetyBand {
  if (score >= 80) return "safe";
  if (score >= 60) return "mostly";
  if (score >= 35) return "caution";
  return "danger";
}

/** A domain both Google and VirusTotal have seen and neither dislikes. */
export function isReputable(d: DomainIntel): boolean {
  const vt = d.virustotal;
  const sb = d.safeBrowsing;
  const vtClean =
    Boolean(vt?.ok) &&
    vt?.known !== false &&
    (vt?.malicious ?? 0) === 0 &&
    (vt?.suspicious ?? 0) === 0 &&
    (vt?.harmless ?? 0) >= 15;
  const sbClean = Boolean(sb?.ok) && (sb?.threats.length ?? 0) === 0;
  const listClean = !d.urlhaus.listed;
  const settled = d.rdap.ageDays == null || d.rdap.ageDays > 365;
  return vtClean && sbClean && listClean && settled;
}

export function computeSafety(assessment: Assessment): SafetyScore {
  const domains = assessment.intel ?? [];
  const basis: string[] = [];

  // Start from the local pattern read, then let real vendors move it.
  let score = Math.max(0, 100 - Math.round(assessment.score * 0.7));

  let google: SafetyScore["google"] = domains.length ? "unavailable" : "skipped";
  let virustotal: SafetyScore["virustotal"] = domains.length ? "unavailable" : "skipped";

  for (const d of domains) {
    const sb = d.safeBrowsing;
    if (sb) {
      if (!sb.configured) google = "not-configured";
      else if (!sb.ok) google = "unavailable";
      else if (sb.threats.length > 0) {
        google = "flagged";
        score = Math.min(score, 4);
        basis.push(`Google Safe Browsing lists ${d.hostname} for ${sb.threats.join(", ")}.`);
      } else if (google !== "flagged") {
        google = "clean";
      }
    }

    const vt = d.virustotal;
    if (vt) {
      const bad = (vt.malicious ?? 0) + (vt.suspicious ?? 0);
      if (!vt.configured) virustotal = "not-configured";
      else if (!vt.ok) virustotal = "unavailable";
      else if (bad > 0) {
        virustotal = "flagged";
        score = Math.min(score, bad >= 3 ? 6 : 26);
        basis.push(
          `VirusTotal: ${bad} of ${vt.total ?? 0} vendors flag ${d.hostname}.`,
        );
      } else if (vt.known === false) {
        if (virustotal !== "flagged") virustotal = "unknown";
        score = Math.min(score, 62);
        basis.push(`${d.hostname} has no VirusTotal history yet.`);
      } else if (virustotal !== "flagged") {
        virustotal = "clean";
        basis.push(
          `VirusTotal: 0 of ${vt.total ?? 0} vendors flag ${d.hostname}.`,
        );
      }
    }

    if (d.urlhaus.listed) {
      score = Math.min(score, 20);
      basis.push(`${d.hostname} appears on a public phishing feed.`);
    }
  }

  if (google === "clean" && virustotal === "clean" && domains.every(isReputable)) {
    score = Math.max(score, 86);
    basis.push("Both Google and VirusTotal have a clean record for this address.");
  }

  if (domains.length === 0) {
    basis.push("No web address to check with Google or VirusTotal — pattern read only.");
  }

  const final = Math.max(0, Math.min(100, Math.round(score)));
  const b = band(final);
  return { score: final, band: b, label: LABEL[b], google, virustotal, basis };
}
