import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <p className="max-w-xl">
          Lantern is an awareness guide, not a forensic verdict. It can miss
          threats and can flag innocent messages. Submissions stay in this
          session and are not stored.
        </p>
        <Link
          to="/learn"
          hash="already"
          className="shrink-0 text-fg underline-offset-4 hover:underline"
        >
          Already tapped or paid?
        </Link>
      </div>
    </footer>
  );
}
