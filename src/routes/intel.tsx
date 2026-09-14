import { createFileRoute } from "@tanstack/react-router";
import { IntelPage } from "@/components/intel/intel-page";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/intel")({
  head: () => ({
    meta: [
      { title: "Threat Intel — Live Phishing Domains & Malware Hashes" },
      {
        name: "description",
        content:
          "Live feed of the newest phishing domains, malware sample hashes, and active toolkits, confirmed against VirusTotal and Google Safe Browsing. Save any entry to your own watchlist.",
      },
      {
        property: "og:title",
        content: "Threat Intel — Live Phishing Domains & Malware Hashes",
      },
      {
        property: "og:description",
        content:
          "Fresh phishing domains, malware hashes, and exploit kits, with a personal watchlist kept on your device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntelRoute,
});

function IntelRoute() {
  return (
    <SiteShell current="intel">
      <IntelPage />
    </SiteShell>
  );
}
