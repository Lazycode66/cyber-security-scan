import { createFileRoute } from "@tanstack/react-router";
import { Guides } from "@/components/hub/guides";
import { Quiz } from "@/components/hub/quiz";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn to Spot Scams — Sentinel" },
      { name: "description", content: "Short guides, real examples, and a quick quiz on phishing, digital-arrest scams, OTP theft, and risky app permissions." },
      { property: "og:title", content: "Learn to Spot Scams — Sentinel" },
      { property: "og:description", content: "Guides, examples, and a quiz to help you pause before you tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Learn,
});

function Learn() {
  return (
    <SiteShell current="learn">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 py-8 sm:px-6 sm:py-12">
        <header className="max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-subtle uppercase">
            Learn
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
            Slow down. Then look again.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Most scams work because they steal time — not because the story is
            clever. These notes, examples, and a short quiz are for that pause.
          </p>
        </header>
        <Quiz />
        <Guides />
      </main>
    </SiteShell>
  );
}
