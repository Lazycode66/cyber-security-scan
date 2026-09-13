import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Check" },
  { to: "/learn", label: "Learn" },
] as const;

export function SiteHeader({ current }: { current: "check" | "learn" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link
          to="/"
          aria-label="Lantern home"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
        <nav
          className="flex items-center rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]"
          aria-label="Primary"
        >
          {LINKS.map((link) => {
            const active =
              (current === "check" && link.to === "/") ||
              (current === "learn" && link.to === "/learn");
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "inline-flex h-10 min-w-16 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors duration-[150ms]",
                  active
                    ? "bg-elevated text-fg"
                    : "text-muted hover:text-fg",
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
