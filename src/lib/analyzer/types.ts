export type InputKind = "link" | "message" | "app";
export type RiskLevel = "low" | "medium" | "high";
export type IndicatorCategory =
  | "phishing"
  | "scam"
  | "app"
  | "urgency"
  | "impersonation"
  | "privacy";

export type AppSource =
  | "play"
  | "appstore"
  | "apk"
  | "web"
  | "chat"
  | "unknown";

export type Indicator = {
  id: string;
  severity: RiskLevel;
  weight: number;
  title: string;
  detail: string;
  category: IndicatorCategory;
};

export type NextStep = {
  title: string;
  detail: string;
};

export type NormalizedUrl = {
  raw: string;
  href: string;
  protocol: string;
  hostname: string;
  registrable: string;
  path: string;
  isIp: boolean;
  isPunycode: boolean;
  decodedHost: string;
};

export type AppDetails = {
  name: string;
  source: AppSource;
  permissions: string[];
  claimedPurpose: string;
  developer: string;
};

export type VirusTotalIntel = {
  ok: boolean;
  configured: boolean;
  malicious?: number | undefined;
  suspicious?: number | undefined;
  harmless?: number | undefined;
  undetected?: number | undefined;
  total?: number | undefined;
  reputation?: number | null | undefined;
  categories?: string[] | undefined;
  known?: boolean | undefined;
  error?: string | undefined;
};

export type SafeBrowsingIntel = {
  ok: boolean;
  configured: boolean;
  threats: string[];
  error?: string | undefined;
};

export type DomainIntel = {
  hostname: string;
  rdap: {
    ok: boolean;
    registrar?: string | undefined;
    created?: string | undefined;
    ageDays?: number | null | undefined;
    nameservers?: string[] | undefined;
    error?: string | undefined;
  };
  urlhaus: {
    ok: boolean;
    listed: boolean;
    threat?: string | undefined;
    tags?: string[] | undefined;
    error?: string | undefined;
  };
  dns: {
    ok: boolean;
    addresses: string[];
    error?: string | undefined;
  };
  virustotal?: VirusTotalIntel | undefined;
  safeBrowsing?: SafeBrowsingIntel | undefined;
};

export type Assessment = {
  kind: InputKind;
  level: RiskLevel;
  score: number;
  headline: string;
  summary: string;
  indicators: Indicator[];
  steps: NextStep[];
  urls: NormalizedUrl[];
  inputPreview: string;
  intel?: DomainIntel[] | undefined;
};

export type AnalyzePayload = {
  kind: InputKind;
  text: string;
  app?: AppDetails | undefined;
};
