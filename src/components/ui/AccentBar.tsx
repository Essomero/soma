import { cn } from "@/lib/utils";

interface AccentBarProps {
  variant?: "small" | "editorial";
  className?: string;
}

export default function AccentBar({
  variant = "small",
  className,
}: AccentBarProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-primary to-secondary",
        variant === "small" ? "w-10 h-1" : "w-12 h-1",
        className
      )}
    />
  );
}
