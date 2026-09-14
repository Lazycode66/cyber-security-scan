import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/logo";
import { cn } from "@/lib/utils";

export type Section = "check" | "history" | "intel" | "learn";

const LINKS = [
  { to: "/", key: "check", label: "Check" },
  { to: "/history", key: "history", label: "History" },
  { to: "/intel", key: "intel", label: "Intel" },
  { to: "/learn", key: "learn", label: "Learn" },
] as const;

export function SiteHeader({ current }: { current: Section }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link
          to="/"
          aria-label="Home"
          className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Wordmark />
        </Link>
        <nav
          className="flex items-center rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]"
          aria-label="Primary"
        >
          {LINKS.map((link) => {
            const active = current === link.key;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "inline-flex h-10 min-w-16 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors duration-[150ms]",
                  active ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
