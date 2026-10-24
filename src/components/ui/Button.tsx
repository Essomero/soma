import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface ButtonProps {
  children: React.ReactNode;
  variant: "primary" | "outline" | "ghost" | "brand" | "white";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  type?: "button" | "submit";
  icon?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  disabled?: boolean;
}
const press = "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";
const variantStyles = {
  primary:
    `bg-brand text-white border-2 border-inverse-surface shadow-brutal-sm ${press}`,
  outline:
    `border-2 border-brand text-brand shadow-brutal-sm hover:bg-brand hover:text-white ${press}`,
  ghost:
    "text-on-surface-muted hover:text-on-surface border-2 border-transparent",
  brand:
    `bg-primary text-on-primary border-2 border-inverse-surface shadow-brutal-sm ${press}`,
  white:
    `bg-white text-surface-lowest border-2 border-inverse-surface shadow-brutal-sm ${press}`,
};

const sizeStyles = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export default function Button({
  children,
  variant,
  size = "md",
  href,
  className,
  type = "button",
  icon,
  onClick,
  disabled,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center gap-2 font-bold rounded-none transition-all font-sora",
    disabled && "opacity-50 cursor-not-allowed pointer-events-none",
    variantStyles[variant],
    sizeStyles[size],
    className
  );

  if (href) {
    return (
      <Link to={href} className={classes}>
        {children}
        {icon}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
      {icon}
    </button>
  );
}
