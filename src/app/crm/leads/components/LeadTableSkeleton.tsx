export default function LeadTableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {/* Toolbar skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 bg-gray-200 rounded-md w-64" />
        <div className="h-9 bg-gray-200 rounded-md w-32" />
        <div className="h-9 bg-gray-200 rounded-md w-32" />
        <div className="h-9 bg-gray-200 rounded-md w-32" />
        <div className="h-9 bg-gray-200 rounded-md w-32" />
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-3 border-b bg-gray-50">
          <div className="grid grid-cols-8 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="p-3 border-b">
            <div className="grid grid-cols-8 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                <div key={j} className="h-4 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
