export default function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />;
}

export function KnowledgeListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
          <Skeleton className="mb-3 h-4 w-20" />
          <Skeleton className="mb-2 h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function RowListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Skeleton className="mb-2 h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
