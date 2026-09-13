import { createFileRoute } from "@tanstack/react-router";
import { ClearedPage } from "@/components/analyzer/cleared-page";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/cleared")({
  head: () => ({
    meta: [
      { title: "Cleared Sites — Sentinel" },
      {
        name: "description",
        content:
          "Links Sentinel flagged as phishing that you know are safe — plus the field guides and official portals for reporting fraud.",
      },
      { property: "og:title", content: "Cleared Sites — Sentinel" },
      {
        property: "og:description",
        content:
          "Manage false positives, then use the official reporting doors for phishing, digital-arrest scams, and malicious apps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClearedRoute,
});

function ClearedRoute() {
  return (
    <SiteShell current="cleared">
      <ClearedPage />
    </SiteShell>
  );
}
