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

export type DomainIntel = {
  hostname: string;
  rdap: {
    ok: boolean;
    registrar?: string;
    created?: string;
    ageDays?: number | null;
    nameservers?: string[];
    error?: string;
  };
  urlhaus: {
    ok: boolean;
    listed: boolean;
    threat?: string;
    tags?: string[];
    error?: string;
  };
  dns: {
    ok: boolean;
    addresses: string[];
    error?: string;
  };
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
  intel?: DomainIntel[];
};

export type AnalyzePayload = {
  kind: InputKind;
  text: string;
  app?: AppDetails;
};
