import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { readmeNavLinks, siteTitle } from "@/content/registry";
import NavHamburger from "./NavHamburger";

// Only these stay visible inline : everything else lives behind the hamburger
const ESSENTIAL_LINKS = readmeNavLinks.slice(0, 3);

export default function ReadMENav() {
  const location = useLocation();

  return (
    <section className="flex flex-col md:flex-row items-baseline justify-between mb-16 gap-6 border-b border-surface-bright pb-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
          <span className="text-brand">The</span> {siteTitle}
        </h1>
        <p className="mt-2 text-on-surface-muted max-w-lg">
          Deep research, synthesized. A personal publishing platform for ideas that matter.
        </p>
      </div>
      <nav className="flex items-center gap-6 pb-2">
        {ESSENTIAL_LINKS.map((link) => {
          const isActive =
            link.href === "/" ? location.pathname === "/" : location.pathname.startsWith(link.href);
          return (
            <Link
              key={link.label}
              to={link.href}
              className={cn(
                "text-sm font-bold uppercase tracking-widest pb-1 border-b-2 transition-all whitespace-nowrap",
                isActive
                  ? "border-brand text-on-surface"
                  : "text-on-surface-muted hover:text-on-surface border-transparent"
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <NavHamburger links={readmeNavLinks} />
      </nav>
    </section>
  );
}
