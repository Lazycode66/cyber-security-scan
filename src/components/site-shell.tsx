import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteShell({
  current,
  children,
}: {
  current: "check" | "learn";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <SiteHeader current={current} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
