import { ArrowUpDown } from "lucide-react";

export interface SortOption {
  value: string;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
];

interface SortControlProps {
  value: string;
  onChange: (value: string) => void;
  options?: SortOption[];
}

// Small right-aligned sort picker for index pages. The list data is already
// fetched; sorting stays client-side so every type behaves the same.
export default function SortControl({ value, onChange, options = SORT_OPTIONS }: SortControlProps) {
  return (
    <label className="inline-flex items-center gap-sm font-sora text-label-caps text-on-surface-muted uppercase">
      <ArrowUpDown className="w-4 h-4" />
      <span className="hidden sm:inline">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-border-default rounded-lg px-sm py-xs font-sora text-label-caps text-on-surface uppercase cursor-pointer hover:border-primary/50 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
