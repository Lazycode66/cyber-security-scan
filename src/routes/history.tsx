import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/components/analyzer/history-page";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Scan History — Sentinel" },
      {
        name: "description",
        content:
          "Review every link and message you have scanned with Sentinel, its risk score, the vendors that flagged it, and what to do next.",
      },
      { property: "og:title", content: "Scan History — Sentinel" },
      {
        property: "og:description",
        content:
          "Your past scans with risk scores, flagged domains, and vendor verdicts — stored on this device only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryRoute,
});

function HistoryRoute() {
  return (
    <SiteShell current="history">
      <HistoryPage />
    </SiteShell>
  );
}
