import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { GraduationCap, History, Radar, ShieldHalf } from "lucide-react";
import { Wordmark } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

export type Section = "check" | "history" | "learn";

const NAV = [
  { to: "/", key: "check", label: "Scanner", hint: "auto-scan", Icon: Radar },
  { to: "/history", key: "history", label: "History", hint: "past scans", Icon: History },
  { to: "/learn", key: "learn", label: "Playbook", hint: "guides · quiz", Icon: GraduationCap },
] as const;

export function SiteShell({
  current,
  children,
}: {
  current: Section;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-bg text-fg">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[image:var(--gradient-grid)] opacity-[0.35]"
      />
      <div className="relative flex min-h-dvh">
        <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface/70 px-4 py-6 backdrop-blur-sm lg:flex">
          <Link
            to="/"
            aria-label="Sentinel home"
            className="flex items-center gap-2.5 rounded-sm px-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Wordmark />
          </Link>

          <nav className="flex flex-col gap-1" aria-label="Sections">
            {NAV.map(({ to, key, label, hint, Icon }) => {
              const active = current === key;
              return (
                <Link
                  key={key}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-[150ms]",
                    active
                      ? "panel-neon text-fg"
                      : "text-muted hover:bg-elevated hover:text-fg",
                  )}
                >
                  <Icon
                    className={cn("size-4 shrink-0", active && "text-accent")}
                    aria-hidden="true"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
                      {hint}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-lg bg-elevated px-3 py-3">
            <div className="flex items-center gap-2">
              <ShieldHalf className="size-3.5 text-neon-lime" aria-hidden="true" />
              <p className="font-mono text-[10px] tracking-[0.16em] text-subtle uppercase">
                feeds online
              </p>
            </div>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">
              VirusTotal · Safe Browsing · RDAP · Public DNS · phishing feeds
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-sm lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <Link to="/" aria-label="Sentinel home" className="flex items-center gap-2">
                <Wordmark />
              </Link>
              <nav
                className="flex items-center rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]"
                aria-label="Sections"
              >
                {NAV.map(({ to, key, label, Icon }) => {
                  const active = current === key;
                  return (
                    <Link
                      key={key}
                      to={to}
                      aria-label={label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-md transition-colors",
                        active ? "bg-elevated text-accent" : "text-muted",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>

          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
