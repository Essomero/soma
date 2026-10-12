import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "brand";
  className?: string;
}

const variantStyles = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent-orange",
  brand: "text-brand bg-brand/10 px-3 py-1 rounded",
};

export default function Tag({
  children,
  variant = "primary",
  className,
}: TagProps) {
  return (
    <span
      className={cn(
        "text-xs font-bold uppercase tracking-widest font-sora",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
