import { Outlet } from "react-router-dom";
import { ReactLenis } from "lenis/react";
import ScrollToTop from "@/lib/ScrollToTop";
import { SearchProvider, useSearch } from "@/lib/SearchContext";
import CommandPalette from "@/components/ui/CommandPalette";
import AuthGuard from "@/components/auth/AuthGuard";
import Header from "./Header";
import Footer from "./Footer";

// Hoisted so ReactLenis' options effect (which depends on a JSON.stringify of
// this object) sees a stable value across renders.
const lenisOptions = {
  lerp: 0.1,
  smoothWheel: true,
  // Without this, clicking a link mid-glide carries the momentum into the new
  // page and it scrolls on arrival.
  stopInertiaOnNavigate: true,
  // smoothWheel makes Lenis `preventDefault` every wheel event, so without this
  // no nested scroll container in the app responds to the wheel : the comment
  // popover, the model dropdown, and a zoomed comment's own body all render a
  // scrollbar their user cannot move. With it, Lenis steps aside for any
  // ancestor that can still scroll in the gesture's direction and leaves the
  // event to the browser, reclaiming it once that container hits its edge (or
  // when it can't move at all, e.g. while `useScrollLock` has the page frozen).
  allowNestedScroll: true,
};

function LayoutInner() {
  const { open, setOpen } = useSearch();

  return (
    <AuthGuard>
      {/* `root` smooths the real document scroll rather than a nested scroller,
          so `position: sticky` sidebars and ScrollToTop keep working. Lenis
          respects prefers-reduced-motion by default. */}
      <ReactLenis root options={lenisOptions}>
        <div className="min-h-screen flex flex-col">
          <ScrollToTop />
          <CommandPalette open={open} onClose={() => setOpen(false)} />
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      </ReactLenis>
    </AuthGuard>
  );
}

export default function Layout() {
  return (
    <SearchProvider>
      <LayoutInner />
    </SearchProvider>
  );
}
