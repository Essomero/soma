import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

interface NavHamburgerProps {
  /** All nav items shown in the popover (the header shows only a few inline). */
  links: NavItem[];
}

export default function NavHamburger({ links }: NavHamburgerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on route change + Escape
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex items-center justify-center w-9 h-9 rounded-none text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Always mounted so the transition animates both ways; hidden via opacity/visibility when closed */}
      <div
        className={cn(
          "absolute top-full right-0 mt-2 z-50 w-56 max-w-[calc(100vw-16px)] rounded-none border-2 border-inverse-surface bg-surface shadow-brutal py-sm overflow-hidden",
          "transition-all duration-200 ease-out origin-top-right",
          open ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible pointer-events-none"
        )}
      >
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(link.href);
          return (
            <Link
              key={link.label}
              to={link.href}
              className={cn(
                "block px-lg py-sm font-sora text-sm uppercase tracking-widest transition-colors",
                isActive
                  ? "text-primary bg-surface-container"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
