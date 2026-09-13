import { cn } from "@/lib/utils";

export function SentinelMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-6", className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2.75 4.75 5.4v6.2c0 4.2 2.9 8.1 7.25 9.65 4.35-1.55 7.25-5.45 7.25-9.65V5.4L12 2.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 12.4h2.1l1.1-2.6 1.3 4 1-1.4h1.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <SentinelMark className="size-5 text-accent" />
      <span className="font-display text-lg font-semibold tracking-[0.16em] uppercase">
        Sentinel
      </span>
    </span>
  );
}
