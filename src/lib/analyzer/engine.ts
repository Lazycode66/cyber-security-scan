import {
  APP_SOURCES,
  BRAND_ALIASES,
  FREE_HOSTS,
  OFFICIAL_DOMAINS,
  PERMISSION_CATALOG,
  PHISHING_WORDS,
  SCAM_RULES,
  SHORTENERS,
  SUSPICIOUS_TLDS,
} from "./data";
import type {
  AnalyzePayload,
  AppDetails,
  Assessment,
  Indicator,
  InputKind,
  NextStep,
  NormalizedUrl,
  RiskLevel,
} from "./types";
import {
  decodeRepeated,
  extractUrls,
  levenshtein,
  parseUrl,
  squashHomoglyphs,
} from "./url";

const DISCLAIMER_STEPS_NOTE =
  "Lantern is an awareness guide, not a forensic verdict. It can miss threats and can flag innocent messages.";

function push(list: Indicator[], item: Indicator) {
  if (list.some((i) => i.id === item.id)) return;
  list.push(item);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasToken(haystack: string, token: string) {
  const re = new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(token)}($|[^a-z0-9])`,
    "i",
  );
  return re.test(haystack);
}

function tldOf(host: string) {
  const parts = host.split(".");
  return parts[parts.length - 1] ?? "";
}

function isOfficial(url: NormalizedUrl): { brand: string } | null {
  for (const [brand, domains] of Object.entries(OFFICIAL_DOMAINS)) {
    if (domains.some((d) => url.registrable === d || url.hostname.endsWith(`.${d}`))) {
      return { brand };
    }
  }
  return null;
}

function sld(registrable: string) {
  return registrable.split(".")[0] ?? registrable;
}

function findBrandInHost(host: string): string | null {
  const compact = host.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const squashed = squashHomoglyphs(compact);
  for (const alias of Object.keys(BRAND_ALIASES)) {
    if (alias.length < 3) continue;
    if (compact.includes(alias) || squashed.includes(alias)) return alias;
    if (levenshtein(squashed, squashHomoglyphs(alias)) === 1 && alias.length >= 5) {
      return alias;
    }
  }
  return null;
}

function findTyposquat(registrable: string): string | null {
  const label = squashHomoglyphs(sld(registrable));
  for (const alias of Object.keys(BRAND_ALIASES)) {
    if (alias.length < 4) continue;
    const dist = levenshtein(label, squashHomoglyphs(alias));
    if (dist > 0 && dist <= (alias.length >= 7 ? 2 : 1)) return alias;
  }
  return null;
}

function scanUrls(urls: NormalizedUrl[], blob: string): Indicator[] {
  const out: Indicator[] = [];
  for (const url of urls) {
    const official = isOfficial(url);
    const hostBlob = `${url.hostname}${url.path}`.toLowerCase();
    const decoded = decodeRepeated(`${url.hostname}${url.path}`).toLowerCase();

    if (url.protocol === "javascript" || url.protocol === "data") {
      push(out, {
        id: `scheme-${url.registrable}`,
        severity: "high",
        weight: 40,
        title: "Dangerous link type",
        detail: `This uses a ${url.protocol}: address, which can run code or hide a fake page inside the link itself.`,
        category: "phishing",
      });
    }

    if (url.isIp) {
      push(out, {
        id: `ip-${url.hostname}`,
        severity: "high",
        weight: 34,
        title: "Website is a raw IP address",
        detail:
          "Banks, shops, and mail providers do not send you to a string of numbers. IP links are a common way to hide the real destination.",
        category: "phishing",
      });
    }

    if (url.isPunycode) {
      push(out, {
        id: `idn-${url.hostname}`,
        severity: "high",
        weight: 30,
        title: "International lookalike domain",
        detail:
          "This address uses encoded characters (punycode). Attackers use them to make a fake site look identical to a real brand.",
        category: "phishing",
      });
    }

    if (url.raw.includes("@") && /https?:\/\/[^/\s]+@/i.test(url.raw)) {
      push(out, {
        id: `at-${url.hostname}`,
        severity: "high",
        weight: 32,
        title: "Hidden destination after @",
        detail:
          "Everything before the @ is a decoy. Browsers go to the host after it — a classic way to dress a malicious site in a trusted name.",
        category: "phishing",
      });
    }

    const labels = url.hostname.split(".");
    if (labels.length >= 5 && !official) {
      push(out, {
        id: `subs-${url.hostname}`,
        severity: "medium",
        weight: 10,
        title: "Unusually long subdomain chain",
        detail: `${url.hostname} has many prefixes. Phishing kits nest extra words like “secure” or “login” in front of a lookalike name.`,
        category: "phishing",
      });
    }

    if (SHORTENERS.has(url.registrable)) {
      push(out, {
        id: `short-${url.registrable}`,
        severity: "medium",
        weight: 14,
        title: "Shortened link hides the destination",
        detail:
          "Short links can point anywhere. Do not tap them from a surprise message. Ask the sender for the full address, or open the official app instead.",
        category: "phishing",
      });
    }

    const tld = tldOf(url.registrable);
    if (SUSPICIOUS_TLDS.has(tld) && !official) {
      push(out, {
        id: `tld-${url.registrable}`,
        severity: "medium",
        weight: 12,
        title: `Uncommon domain ending .${tld}`,
        detail:
          "This ending is cheap and frequently used for throwaway phishing sites. It is not proof by itself, but it is a reason to slow down.",
        category: "phishing",
      });
    }

    if (
      FREE_HOSTS.some(
        (h) => url.registrable === h || url.hostname.endsWith(`.${h}`),
      )
    ) {
      push(out, {
        id: `freehost-${url.hostname}`,
        severity: "medium",
        weight: 16,
        title: "Hosted on a free website platform",
        detail:
          "Anyone can publish a page here in minutes. Real banks and tax offices do not collect logins on free hosting.",
        category: "phishing",
      });
    }

    if (url.protocol === "http" && !url.isIp) {
      push(out, {
        id: `http-${url.hostname}`,
        severity: official ? "low" : "medium",
        weight: official ? 4 : 10,
        title: "Not encrypted (http)",
        detail:
          "The connection is not locked. A login page on plain http is a strong warning, even if the name looks familiar.",
        category: "phishing",
      });
    }

    if (!official) {
      const brand =
        findBrandInHost(url.hostname.replace(/\./g, "")) ??
        findBrandInHost(sld(url.registrable)) ??
        findTyposquat(url.registrable);
      if (brand) {
        const canon = BRAND_ALIASES[brand] ?? brand;
        const officialList = OFFICIAL_DOMAINS[canon] ?? [];
        if (!officialList.includes(url.registrable)) {
          push(out, {
            id: `lookalike-${url.registrable}`,
            severity: "high",
            weight: 38,
            title: `Mimics ${brand} but is not the official site`,
            detail: `${url.registrable} borrows the name “${brand}”. Official pages live on ${officialList.slice(0, 2).join(" or ") || "the company’s real domain"} — not this address.`,
            category: "phishing",
          });
        }
      }

      const bait = PHISHING_WORDS.filter(
        (w) => hostBlob.includes(w) || decoded.includes(w),
      );
      if (bait.length >= 2) {
        push(out, {
          id: `bait-${url.registrable}`,
          severity: "medium",
          weight: 12,
          title: "Login or verification words in the address",
          detail: `The link leans on words like ${bait.slice(0, 3).join(", ")}. Combined with an unfamiliar domain, that is a typical fake sign-in page.`,
          category: "phishing",
        });
      }
    }
  }

  const lower = blob.toLowerCase();
  if (
    /\b(verify|confirm|update|unlock)\b/i.test(lower) &&
    urls.length > 0 &&
    urls.every((u) => !isOfficial(u))
  ) {
    push(out, {
      id: "cta-unofficial",
      severity: "medium",
      weight: 8,
      title: "Asks you to verify on an unofficial site",
      detail:
        "If a message wants you to ‘verify’, ‘update’, or ‘unlock’, type the service name into your app store or bookmarks. Never use the link in the message.",
      category: "phishing",
    });
  }

  return out;
}

function scanScamLanguage(text: string): Indicator[] {
  const out: Indicator[] = [];
  const lower = text.toLowerCase();
  for (const rule of SCAM_RULES) {
    const hitPhrase = rule.phrases.some((p) => lower.includes(p));
    const hitToken = (rule.tokens ?? []).some((t) => hasToken(lower, t));
    if (!hitPhrase && !hitToken) continue;
    push(out, {
      id: rule.id,
      severity: rule.severity,
      weight: rule.weight,
      title: rule.title,
      detail: rule.detail,
      category: rule.category,
    });
  }

  const threat = out.some(
    (i) => i.id === "digital-arrest" || i.id === "law-enforcement",
  );
  const pay = out.some((i) => i.id === "payment-demand");
  const isolate = out.some((i) => i.id === "isolation");
  if (threat && (pay || isolate)) {
    push(out, {
      id: "arrest-combo",
      severity: "high",
      weight: 20,
      title: "Classic digital-arrest pattern",
      detail:
        "A fake official, a threat of arrest, and a demand to stay on the line or pay — that combination is the scam, not a coincidence.",
      category: "scam",
    });
  }
  return out;
}

function scanApp(app: AppDetails): Indicator[] {
  const out: Indicator[] = [];
  const sourceLabel =
    APP_SOURCES.find((s) => s.id === app.source)?.label ?? app.source;
  const sideloaded =
    app.source === "apk" || app.source === "web" || app.source === "chat";

  if (sideloaded) {
    push(out, {
      id: "sideload",
      severity: "high",
      weight: app.source === "apk" || app.source === "chat" ? 32 : 24,
      title: `Installed from ${sourceLabel}`,
      detail:
        "Apps sent as files, or downloaded from a random site, skip the store’s malware checks. Loan, job, and ‘mod’ APKs are a frequent way to steal OTPs.",
      category: "app",
    });
  } else if (app.source === "unknown") {
    push(out, {
      id: "unknown-source",
      severity: "medium",
      weight: 12,
      title: "Install source is unclear",
      detail:
        "If you cannot say which store it came from, treat it as untrusted until you can reinstall from Google Play or the App Store.",
      category: "app",
    });
  }

  const selected = PERMISSION_CATALOG.filter((p) =>
    app.permissions.includes(p.id),
  );
  for (const perm of selected) {
    const bump = sideloaded && perm.highRisk ? 8 : 0;
    push(out, {
      id: `perm-${perm.id}`,
      severity: perm.highRisk ? "high" : "medium",
      weight: perm.weight + bump,
      title: `Wants ${perm.label.toLowerCase()} access`,
      detail: perm.hint + ".",
      category: "app",
    });
  }

  const purpose = `${app.claimedPurpose} ${app.name}`.toLowerCase();
  const looksSimple =
    /calculator|torch|flashlight|cleaner|wallpaper|photo|filter|game|vpn|pdf|reader/.test(
      purpose,
    );
  const dangerous = selected.filter((p) => p.highRisk);
  if (looksSimple && dangerous.length) {
    push(out, {
      id: "purpose-mismatch",
      severity: "high",
      weight: 18,
      title: "Permissions do not match the job",
      detail: `A ${app.name || "simple utility"} does not need ${dangerous.map((p) => p.label.toLowerCase()).join(", ")}. That mismatch is a common malware tell.`,
      category: "app",
    });
  }

  if (
    /loan|credit|kyc|bank|wallet|upi|invest|trading|rebate|earn/.test(purpose) &&
    sideloaded
  ) {
    push(out, {
      id: "finance-sideload",
      severity: "high",
      weight: 22,
      title: "Money app from outside the store",
      detail:
        "Anything that touches loans, KYC, or wallets should come only from the official store listing of that company — never a file on chat.",
      category: "app",
    });
  }

  if (/unknown|random|friend|whatsapp|telegram/i.test(app.developer) && sideloaded) {
    push(out, {
      id: "unknown-dev",
      severity: "medium",
      weight: 10,
      title: "Developer is not identifiable",
      detail:
        "A nameless publisher plus a file from chat is enough reason to delete the app and keep your banking apps on a clean phone.",
      category: "app",
    });
  }

  return out;
}

function levelFromScore(score: number, indicators: Indicator[]): RiskLevel {
  if (indicators.some((i) => i.severity === "high" && i.weight >= 28)) {
    return score >= 40 ? "high" : "medium";
  }
  if (score >= 55) return "high";
  if (score >= 24) return "medium";
  return "low";
}

function headlineFor(level: RiskLevel, kind: InputKind): string {
  if (level === "high") {
    if (kind === "app") return "This app looks dangerous — do not keep it.";
    if (kind === "link") return "This looks like a phishing trap.";
    return "This reads like a scam. You can ignore it.";
  }
  if (level === "medium") {
    return "Some warning signs. Pause and verify another way.";
  }
  return "No clear threat pattern — still verify unexpected asks.";
}

function summaryFor(
  level: RiskLevel,
  kind: InputKind,
  indicators: Indicator[],
): string {
  const top = indicators
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((i) => i.title.toLowerCase());
  if (level === "high") {
    const joined = top.length
      ? ` The strongest flags: ${top.join("; ")}.`
      : "";
    return (
      "Several hallmarks of fraud showed up together. Do not tap, pay, share a code, or install anything from this." +
      joined +
      " Real institutions will not rush you over a private chat."
    );
  }
  if (level === "medium") {
    return (
      "This is not a clean pass. " +
      (top.length
        ? `Worth a closer look because of ${top.join(", ")}. `
        : "") +
      "Open the company from a bookmark or the official app — never from this message — and ask a person you trust if you feel pressured."
    );
  }
  if (kind === "link") {
    return "The address does not match common phishing tricks. That is not a guarantee it is harmless. If the request is unexpected, still go through the official app.";
  }
  return "The wording does not match common scam scripts. Stay cautious with any request for money, codes, or downloads you were not expecting.";
}

function stepsFor(level: RiskLevel, kind: InputKind): NextStep[] {
  const shared: NextStep[] = [];
  if (level === "high") {
    shared.push(
      {
        title: "Stop. Do not engage.",
        detail:
          "Do not tap the link, reply, pay, share an OTP, or install an app. Hang up if you are on a call.",
      },
      {
        title: "Verify on a channel you choose.",
        detail:
          "Look up the official number or app yourself. Never call back a number from the message.",
      },
      {
        title: "Report it.",
        detail:
          "In India: cybercrime.gov.in or 1930. In the US: reportfraud.ftc.gov. Forward phishing to the real company when they publish an address.",
      },
    );
    if (kind === "app") {
      shared.splice(1, 0, {
        title: "Uninstall and scan.",
        detail:
          "Delete the app. If you granted accessibility or device admin, revoke that first in Settings. Run a Play Protect scan, then change banking passwords from another device.",
      });
    }
  } else if (level === "medium") {
    shared.push(
      {
        title: "Do not use the contact details in the message.",
        detail:
          "Type the organisation’s name into your browser or open the app you already installed from the store.",
      },
      {
        title: "Ask a second pair of eyes.",
        detail:
          "Pressure drops when you talk it through. A bank will wait. A scammer will not.",
      },
    );
  } else {
    shared.push({
      title: "Keep the usual habits.",
      detail:
        "Unexpected money requests, codes, or logins still deserve a pause — even when this scan is quiet.",
    });
  }
  shared.push({
    title: "If you already tapped or paid",
    detail:
      "Use another device to change passwords, call your bank, and file a report. See the Learn page for a calm sequence.",
  });
  return shared;
}

function previewOf(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}…` : trimmed;
}

export function analyze(payload: AnalyzePayload): Assessment {
  const text = payload.text.trim();
  const appText = payload.app
    ? [payload.app.name, payload.app.developer, payload.app.claimedPurpose]
        .filter(Boolean)
        .join("\n")
    : "";
  const blob = `${text}\n${appText}`;
  const urls =
    payload.kind === "app"
      ? extractUrls(blob)
      : extractUrls(blob).length
        ? extractUrls(blob)
        : payload.kind === "link" && text
          ? [parseUrl(text)].filter((u): u is NormalizedUrl => u !== null)
          : extractUrls(blob);

  const indicators: Indicator[] = [];
  if (payload.kind !== "app") {
    indicators.push(...scanUrls(urls, blob));
    indicators.push(...scanScamLanguage(blob));
  } else if (payload.app) {
    indicators.push(...scanApp(payload.app));
    indicators.push(...scanScamLanguage(blob));
    indicators.push(...scanUrls(urls, blob));
  }

  const score = Math.min(
    100,
    indicators.reduce((sum, i) => sum + i.weight, 0),
  );
  const level = levelFromScore(score, indicators);

  return {
    kind: payload.kind,
    level,
    score,
    headline: headlineFor(level, payload.kind),
    summary: summaryFor(level, payload.kind, indicators),
    indicators: indicators.sort((a, b) => b.weight - a.weight),
    steps: stepsFor(level, payload.kind),
    urls,
    inputPreview: previewOf(text || appText) || "—",
  };
}

export { DISCLAIMER_STEPS_NOTE };
