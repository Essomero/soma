import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSpringScroll } from "@/lib/useSpringScroll";
import type { TocItem } from "@/types";

interface SidebarTocProps {
  items: TocItem[];
  label?: string;
}

export default function SidebarToc({ items, label = "In this Guide" }: SidebarTocProps) {
  const [activeSection, setActiveSection] = useState(items[0]?.href ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    items.forEach((item) => {
      try {
        const id = item.href.startsWith("#") ? item.href.slice(1) : item.href;
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      } catch { /* invalid selector : skip */ }
    });

    return () => observer.disconnect();
  }, [items]);

  const jumpTo = useSpringScroll(-100);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Only swallow the click if we actually found the target : otherwise let
    // the browser handle the hash.
    if (jumpTo(href)) e.preventDefault();
  };

  return (
    <div className="glass-card p-lg rounded-xl">
      <h3 className="font-sora text-label-caps uppercase text-primary mb-md">
        {label}
      </h3>
      <ul className="space-y-md font-sora text-metadata-tag text-on-surface-variant">
        {items.map((item) => (
          <li key={item.number} className="flex gap-sm hover:text-on-surface transition-colors">
            <span
              className={cn(
                "transition-colors",
                activeSection === item.href ? "text-secondary" : "text-on-surface-muted"
              )}
            >
              {item.number}
            </span>
            <a
              href={item.href}
              onClick={(e) => handleClick(e, item.href)}
              className={cn(
                "transition-colors",
                activeSection === item.href
                  ? "text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
