import type { ReactNode } from "react";
import { NavLink as RouterNavLink, type NavLinkProps as RouterNavLinkProps } from "react-router";
import { Glyph } from "@/components/ui/glyph";
import { cn } from "@/lib/utils";

export type NavLinkProps = Omit<RouterNavLinkProps, "className" | "style"> & {
  className?: string;
};

/*
 * Row anatomy (v4 craft pass): [12px marker cell][label]. All states live inside the same row box.
 *  - rest:    hollow diamond marker
 *  - hover:   4px ink bar wipes in at the left edge, tint, diamond gets a dot (partial: it is not the current look)
 *  - current: full ink band, filled diamond, no seam (the reserved 1px rules stay transparent)
 *  - focus:   2px inset ring in currentColor; it never leaves the row box, so stacked rows never overpaint each other
 *    and a scroll container never clips it. Reads on the ink band too (currentColor flips with it).
 * Hangul labels carry no letter-spacing or uppercase; both only loosen/do nothing for Korean.
 * State comes from react-router: it sets aria-current="page" on the active link.
 */
const base = [
  "group/nav relative flex min-h-row w-full items-center gap-3 px-pad-md no-underline",
  "border-y-(length:--menu-rule) border-transparent",
  "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-no-repeat bg-[length:0%_100%] bg-left",
  "text-yorha-sm font-yorha-medium tracking-yorha-body text-yorha-fg-ink",
  "yorha-wipe yorha-tint",
  "[@media(hover:hover)_and_(pointer:fine)]:hover:not-aria-[current=page]:bg-[length:4px_100%]",
  "focus-visible:yorha-focus-inset",
  "aria-[current=page]:bg-[length:100%_100%] aria-[current=page]:text-yorha-on-ink",
];

const MARK = "absolute inset-0 opacity-0";

function Marker() {
  return (
    <span data-slot="nav-link-marker" aria-hidden="true" className="relative block size-icon-sm shrink-0">
      <Glyph name="diamond-ring" className={cn(MARK, "opacity-100 group-aria-[current=page]/nav:opacity-0 group-hover/nav:opacity-0")} />
      <Glyph name="diamond-dot" className={cn(MARK, "group-hover/nav:opacity-100 group-aria-[current=page]/nav:opacity-0")} />
      <Glyph name="diamond" className={cn(MARK, "group-aria-[current=page]/nav:opacity-100")} />
    </span>
  );
}

export function NavLink({ className, ref, children, ...props }: NavLinkProps & { ref?: React.Ref<HTMLAnchorElement> }) {
  return (
    <RouterNavLink ref={ref} className={cn(base, className)} {...props}>
      {(state) => (
        <>
          <Marker />
          {typeof children === "function" ? (children as (s: typeof state) => ReactNode)(state) : children}
        </>
      )}
    </RouterNavLink>
  );
}
