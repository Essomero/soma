import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Sun, Moon, Plus, Github, LogOut, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";
import Tooltip from "@/components/ui/Tooltip";

interface NavHamburgerProps {
  /** All nav items shown in the popover (the header shows only a few inline). */
  links: NavItem[];
  /** When true, show an Admin link at the bottom of the menu. */
  authed?: boolean;
  /** Current theme for the inline toggle inside the dropdown. */
  theme?: "dark" | "light";
  /** Called when the user taps the theme toggle in the dropdown. */
  onToggleTheme?: () => void;
  /** Called when the user taps Sign out inside the dropdown. */
  onSignOut?: () => void;
}

export default function NavHamburger({ links, authed, theme, onToggleTheme, onSignOut }: NavHamburgerProps) {
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
      <Tooltip label={open ? "Close menu" : "Open menu"} position="bottom" align="start">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex items-center justify-center w-9 h-9 rounded-none text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </Tooltip>

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
        {/* Separator before utility items */}
        <div className="border-t border-border-default mx-lg my-xs" />

        {/* New Note — shown only in the dropdown on mobile/tablet; desktop (lg+) has it inline */}
        {authed && (
          <Link
            to="/notes/new"
            onClick={() => setOpen(false)}
            className="lg:hidden flex items-center gap-md w-full px-lg py-sm font-sora text-sm uppercase tracking-widest transition-colors text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          >
            <Plus className="w-4 h-4" />
            New Note
          </Link>
        )}

        {/* GitHub */}
        <a
          href="https://github.com/Essomero/soma"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className="flex items-center gap-md w-full px-lg py-sm font-sora text-sm uppercase tracking-widest transition-colors text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
        >
          <Github className="w-4 h-4" />
          GitHub
          <ExternalLink className="w-3 h-3 ml-auto text-on-surface-muted" />
        </a>

        {/* Theme toggle */}
        {theme && onToggleTheme && (
          <button
            onClick={() => { onToggleTheme(); setOpen(false); }}
            className="flex items-center justify-between w-full px-lg py-sm font-sora text-sm uppercase tracking-widest transition-colors text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="flex items-center gap-md">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              Theme
            </span>
            <span className="text-xs text-on-surface-muted">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        )}

        {/* Admin + Sign out */}
        {authed && (
          <>
            <div className="border-t border-border-default mx-lg my-xs" />
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="block px-lg py-sm font-sora text-sm uppercase tracking-widest transition-colors text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            >
              Admin
            </Link>
            <button
              onClick={() => { setOpen(false); onSignOut?.(); }}
              className="flex items-center gap-md w-full px-lg py-sm font-sora text-sm uppercase tracking-widest transition-colors text-on-surface-variant hover:text-error hover:bg-surface-container"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
