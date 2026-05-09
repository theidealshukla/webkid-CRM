"use client";
import { cn } from "@/lib/utils";

export function PublishToggle({
  value, onChange, disabled,
}: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        value ? "bg-emerald-500" : "bg-gray-300",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <span className={cn(
        "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
        value ? "translate-x-5" : "translate-x-0.5"
      )} />
    </button>
  );
}
