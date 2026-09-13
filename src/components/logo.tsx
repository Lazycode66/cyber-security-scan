import { cn } from "@/lib/utils";

export function LanternMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-6", className)}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 8.5h6l-.85 9.2a2.2 2.2 0 0 1-2.18 2h-.14a2.2 2.2 0 0 1-2.18-2L9 8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 8.5V7.2a2.8 2.8 0 0 1 5.6 0v1.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 8.5h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 12.2v3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <LanternMark className="size-5 text-accent" />
      <span className="font-display text-lg font-medium tracking-tight">
        Lantern
      </span>
    </span>
  );
}
