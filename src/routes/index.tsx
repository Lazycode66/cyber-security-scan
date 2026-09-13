import { createFileRoute } from "@tanstack/react-router";
import { CheckPage } from "@/components/analyzer/check-page";
import { SiteShell } from "@/components/site-shell";

type Search = {
  sample?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    sample: typeof search.sample === "string" ? search.sample : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sentinel — Live Scam & Phishing Link Scanner" },
      {
        name: "description",
        content:
          "Paste a link, message, or app and Sentinel auto-scans it for phishing, scam scripts, and risky permissions with live registry, DNS, and malware-feed checks.",
      },
      { property: "og:title", content: "Sentinel — Live Scam & Phishing Link Scanner" },
      {
        property: "og:description",
        content:
          "Auto-scan any suspicious link or message and get an instant risk warning with the reasons behind it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { sample } = Route.useSearch();
  return (
    <SiteShell current="check">
      <CheckPage sampleId={sample} />
    </SiteShell>
  );
}
