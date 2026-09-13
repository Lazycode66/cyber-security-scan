import type { IndicatorCategory, RiskLevel } from "./types";

export type ReportIndicator = {
  id: string;
  title: string;
  detail: string;
  severity: RiskLevel;
  category: IndicatorCategory;
};

export type ReportInput = {
  level: RiskLevel;
  score: number;
  safety: number;
  kind: "link" | "message" | "app";
  hosts: string[];
  headline: string;
  indicators: ReportIndicator[];
  safeBrowsing: boolean;
  vendorHits: number;
};

export type Tactic = {
  key: IndicatorCategory;
  name: string;
  playbook: string;
  evidence: string[];
};

export type Mitigation = {
  phase: "Now" | "Today" | "This week";
  title: string;
  detail: string;
};

const TACTICS: Record<IndicatorCategory, { name: string; playbook: string }> = {
  phishing: {
    name: "Credential harvesting",
    playbook:
      "A lookalike page collects your login, OTP, or card details and replays them to the real service within seconds. The page is usually a copied template hosted on a throwaway domain or a free site builder.",
  },
  impersonation: {
    name: "Authority and brand impersonation",
    playbook:
      "The sender borrows a trusted identity — a bank, courier, tax office, police, or your own IT team — so you obey instead of verifying. Logos, signatures, and reference numbers are copied to look procedural.",
  },
  urgency: {
    name: "Manufactured urgency and fear",
    playbook:
      "A deadline, penalty, arrest threat, or account suspension is invented to collapse your thinking time. Under time pressure people skip the one step that defeats the attack: checking through a channel they already trust.",
  },
  scam: {
    name: "Financial lure and advance fee",
    playbook:
      "A refund, prize, job, investment return, or cheap deal is offered, then a small payment, fee, or 'verification transfer' is requested first. The first payment exists to confirm you will pay again.",
  },
  app: {
    name: "Malicious app sideloading",
    playbook:
      "You are pushed to install a file or app outside the official store, often framed as a support, KYC, or tracking tool. Once installed it can read your screen, SMS, and OTPs.",
  },
  privacy: {
    name: "Over-broad data access",
    playbook:
      "Permissions or data requests go far beyond the stated purpose — contacts, SMS, accessibility, camera, or identity documents — creating leverage for later fraud or extortion.",
  },
};

const ORDER: IndicatorCategory[] = [
  "phishing",
  "impersonation",
  "urgency",
  "scam",
  "app",
  "privacy",
];

export function tacticsFor(input: ReportInput): Tactic[] {
  const grouped = new Map<IndicatorCategory, string[]>();
  for (const i of input.indicators) {
    const list = grouped.get(i.category) ?? [];
    list.push(i.title);
    grouped.set(i.category, list);
  }
  return ORDER.filter((key) => grouped.has(key)).map((key) => ({
    key,
    name: TACTICS[key].name,
    playbook: TACTICS[key].playbook,
    evidence: grouped.get(key) ?? [],
  }));
}

export function mitigationsFor(input: ReportInput): Mitigation[] {
  const out: Mitigation[] = [];
  const host = input.hosts[0];

  out.push({
    phase: "Now",
    title: "Stop interacting with it",
    detail:
      "Close the page or chat. Do not reply, do not tap any further links, and do not read an OTP aloud or forward one. Attackers keep the conversation alive because momentum is their main tool.",
  });

  if (input.safeBrowsing || input.vendorHits > 0) {
    out.push({
      phase: "Now",
      title: "Treat this address as confirmed hostile",
      detail: `${
        input.safeBrowsing ? "Google Safe Browsing" : "Security vendors on VirusTotal"
      } already classify ${host ?? "this address"} as dangerous. Anything you typed on it should be considered captured.`,
    });
  }

  if (input.kind === "app") {
    out.push({
      phase: "Now",
      title: "Uninstall and check accessibility access",
      detail:
        "Remove the app, then open Settings and revoke Accessibility, Notification access, SMS, and Device admin for anything you do not recognise. Reboot in safe mode if the app resists removal.",
    });
  }

  out.push({
    phase: "Now",
    title: "Change the password you may have typed",
    detail:
      "If you entered a password anywhere on that page, change it on the real site — typed in yourself, not from a link — and change it anywhere you reused it. Sign out of all other sessions.",
  });

  out.push({
    phase: "Today",
    title: "Turn on app-based two-factor authentication",
    detail:
      "Move the account from SMS codes to an authenticator app or passkey. Stolen passwords stop being enough, and OTP-relay pages lose most of their value.",
  });

  out.push({
    phase: "Today",
    title: "Verify through a channel you already trusted before today",
    detail: `Call the number on your card, the official app, or a bookmarked site. Never the number, link, or QR code inside the message${
      host ? ` from ${host}` : ""
    }.`,
  });

  if (input.vendorHits > 0 || input.level === "high") {
    out.push({
      phase: "Today",
      title: "Watch the money and report it",
      detail:
        "Check recent transactions, set a low transaction alert, and report the fraud to your bank and national cybercrime portal. Early reports are what get accounts frozen.",
    });
  }

  out.push({
    phase: "This week",
    title: "Run a device and inbox review",
    detail:
      "Update the OS and browser, run a reputable scanner, and check mail rules, forwarding addresses, and connected apps — attackers add quiet persistence after a successful capture.",
  });

  out.push({
    phase: "This week",
    title: "Report the address so others get the warning",
    detail: `Submit ${
      host ?? "the link"
    } to Google Safe Browsing (safebrowsing.google.com/safebrowsing/report_phish) and VirusTotal. That is how the next person's scan comes back flagged.`,
  });

  return out;
}
