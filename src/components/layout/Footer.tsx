import { siteTitle } from "@/content/registry";

export default function Footer() {
  return (
    <footer className="bg-surface-lowest border-t border-border-default w-full py-xl">
      <div className="flex flex-col md:flex-row justify-between items-center px-gutter md:px-margin-desktop gap-md max-w-readme mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-xl">
          <span className="font-dm-sans text-sm text-on-surface-muted">
            {siteTitle} © 2026
          </span>
        </div>
      </div>
    </footer>
  );
}
