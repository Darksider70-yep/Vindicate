const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/20 ${className}`}
      {...props}
    />
  );
};

const PageSkeleton = () => (
  <div className="p-4 sm:p-6">
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-24" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <Skeleton className="h-64 mt-6" />
  </div>
);

export { Skeleton, PageSkeleton };
