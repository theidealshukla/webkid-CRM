export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-7 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-72" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-8 w-8 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-16" />
            <div className="h-3 bg-gray-100 rounded w-32" />
          </div>
        ))}
      </div>

      {/* Batch cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-100 rounded w-24" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        <div className="lg:col-span-4 bg-white rounded-xl border p-6">
          <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
          <div className="h-64 bg-gray-50 rounded-lg" />
        </div>
        <div className="lg:col-span-3 bg-white rounded-xl border p-6">
          <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
          <div className="h-64 bg-gray-50 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
