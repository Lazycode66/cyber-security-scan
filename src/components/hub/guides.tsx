import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { GUIDES, REPORT_CHANNELS } from "@/lib/analyzer/hub";
import { SAMPLES } from "@/lib/analyzer";

export function Guides() {
  const [open, setOpen] = useState<string>("");

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !GUIDES.some((guide) => guide.id === hash)) return;
    setOpen(hash);
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col gap-12">
      <section>
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">
          Field notes
        </p>
        <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">
          A short briefing on the usual traps
        </h2>
        <Accordion
          type="single"
          collapsible
          value={open}
          onValueChange={setOpen}
          className="mt-6"
        >
          {GUIDES.map((guide) => (
            <AccordionItem
              key={guide.id}
              value={guide.id}
              id={guide.id}
              className="scroll-mt-20"
            >
              <AccordionTrigger>
                <span className="flex flex-col items-start gap-1 pr-4">
                  <span className="text-xs font-medium tracking-wide text-subtle uppercase">
                    {guide.kicker}
                  </span>
                  <span>{guide.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex max-w-2xl flex-col gap-3">
                  {guide.body.map((para) => (
                    <p key={para} className="leading-relaxed">
                      {para}
                    </p>
                  ))}
                  {guide.id === "phishing" ? (
                    <TrySample
                      sampleId="paypal-lookalike"
                      label="Check a PayPal lookalike"
                    />
                  ) : null}
                  {guide.id === "digital-arrest" ? (
                    <TrySample
                      sampleId="digital-arrest"
                      label="Check a digital-arrest script"
                    />
                  ) : null}
                  {guide.id === "apps" ? (
                    <TrySample
                      sampleId="loan-apk"
                      label="Check a sideloaded loan app"
                    />
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section>
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">
          Report
        </p>
        <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">
          Official doors, not the number in the message
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {REPORT_CHANNELS.map((group) => (
            <div
              key={group.region}
              className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
            >
              <h3 className="text-sm font-medium text-fg">{group.region}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {group.items.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
                      rel={
                        item.href.startsWith("http") ? "noreferrer" : undefined
                      }
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TrySample({ sampleId, label }: { sampleId: string; label: string }) {
  const sample = SAMPLES.find((s) => s.id === sampleId);
  if (!sample) return null;
  return (
    <Link
      to="/"
      search={{ sample: sampleId }}
      className="mt-2 inline-flex h-11 items-center text-sm font-medium text-fg underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  );
}
