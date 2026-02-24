import { cn } from "../../utils/ui";

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-lg bg-panel", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
      <Skeleton className="h-9 w-52" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-56" />
      <Skeleton className="h-56" />
    </div>
  );
}