import { Users, Search } from "lucide-react";

interface EmptyStateProps {
  type: "no-leads" | "no-results";
}

export default function EmptyState({ type }: EmptyStateProps) {
  if (type === "no-results") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm flex items-center justify-center mb-5">
          <Search className="h-8 w-8 text-indigo-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">No results found</h3>
        <p className="text-sm font-medium text-gray-500 max-w-sm">
          Try adjusting your search or filter criteria to find what you&#39;re looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm flex items-center justify-center mb-5">
        <Users className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">No leads yet</h3>
      <p className="text-sm font-medium text-gray-500 max-w-sm">
        Get started by adding a lead manually or uploading an Excel file.
      </p>
    </div>
  );
}
