export { analyze, DISCLAIMER_STEPS_NOTE } from "./engine";
export { SAMPLES, getSample } from "./samples";
export { APP_SOURCES, PERMISSION_CATALOG } from "./data";
export { lookupIntel, applyIntel } from "./intel";
export { lookupThreatFeed } from "./threat-feed";
export type {
  ThreatFeed,
  FeedPhishingDomain,
  FeedMalwareHash,
  FeedKit,
} from "./threat-feed";
export { looksReputable, softenWithEvidence } from "./trust";
export type { IntelResult } from "./intel";
export type {
  AnalyzePayload,
  AppDetails,
  AppSource,
  Assessment,
  DomainIntel,
  Indicator,
  InputKind,
  NextStep,
  RiskLevel,
} from "./types";
