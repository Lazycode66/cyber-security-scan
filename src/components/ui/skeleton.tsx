import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-md bg-elevated pulse-soft", className)}
      {...props}
    />
  );
}

export { Skeleton };
