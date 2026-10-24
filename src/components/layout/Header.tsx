import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, LogOut, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/lib/SearchContext";
import { useTheme } from "@/lib/ThemeContext";
import { innerNavLinks, siteTitle } from "@/content/registry";
import Tooltip from "@/components/ui/Tooltip";
import NavHamburger from "./NavHamburger";

// Only these stay visible inline : everything else lives behind the hamburger
const ESSENTIAL_LINKS = innerNavLinks.slice(0, 3);

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [authed, setAuthed] = useState(false);
  const location = useLocation();
  const { setOpen } = useSearch();
  const { theme, toggleTheme } = useTheme();
  useEffect(() => {
    setAuthed(document.cookie.includes("soma_auth="));
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("scroll", handleScroll); window.removeEventListener("keydown", handleKey); };
  }, [setOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border-default bg-surface/80 backdrop-blur-md transition-shadow",
        scrolled && "shadow-xl"
      )}
    >
      <nav className="mx-auto flex max-w-readme items-center justify-between px-gutter md:px-margin-desktop h-16">
        {/* Left: Logo + essential links + hamburger */}
        <div className="flex items-center gap-lg">
          <Link
            to="/"
            className="flex items-center gap-sm font-sora text-article-title font-bold text-on-surface tracking-tighter hover:text-primary transition-colors"
          >
            <img
              src="/icon-soma.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 dark:invert-0 invert transition-all"
            />
            {siteTitle}
          </Link>
          <div className="hidden md:flex items-center gap-lg">
            {ESSENTIAL_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.href);
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className={cn(
                    "font-sora text-metadata-tag uppercase tracking-widest transition-colors duration-200 underline underline-offset-8 decoration-2",
                    isActive
                      ? "text-primary decoration-secondary-container"
                      : "text-on-surface-variant hover:text-primary decoration-transparent"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <NavHamburger links={innerNavLinks} />
        </div>

        {/* Right: Theme toggle + Search + Sign Out */}
        <div className="flex items-center gap-sm md:gap-md">
          <Tooltip label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} position="bottom">
            <button
              onClick={toggleTheme}
              className="p-2 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-low transition-colors"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
          </Tooltip>
          <button onClick={() => setOpen(true)} className="p-2 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-low transition-colors" aria-label="Search (Cmd+K)">
            <Search className="w-5 h-5" />
          </button>
          {authed && (
            <Tooltip label="Sign out" position="bottom">
              <button
                onClick={() => { document.cookie = "soma_auth=; Path=/; Max-Age=0"; window.location.reload(); }}
                className="p-2 text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-container-low transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </nav>
    </header>
  );
}
