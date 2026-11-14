import { NavLink as RouterNavLink, type NavLinkProps as RouterNavLinkProps } from "react-router";
import { cn } from "@/lib/utils";

export type NavLinkProps = Omit<RouterNavLinkProps, "className" | "style"> & {
  className?: string;
};

/*
 * Selected row: dark fill wiping left to right (background-size), square bullet in
 * currentColor, thin rules above and below. The rules are always laid out (transparent
 * when inactive) so selecting a row does not shift its neighbours.
 * State comes from react-router: it sets aria-current="page" on the active link.
 */
const base = [
  "relative flex w-full items-center gap-3 px-4 py-2 no-underline",
  "border-y-(length:--menu-rule) border-transparent",
  "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-no-repeat bg-[length:0%_100%] bg-left",
  "text-yorha-sm font-yorha-medium uppercase tracking-yorha-wide leading-yorha-snug text-yorha-fg-ink",
  "yorha-wipe",
  "before:size-1.5 before:shrink-0 before:bg-current before:content-['']",
  "focus-visible:yorha-focus",
  "aria-[current=page]:bg-[length:100%_100%] aria-[current=page]:border-yorha-border aria-[current=page]:text-yorha-on-ink",
];

export function NavLink({ className, ref, ...props }: NavLinkProps & { ref?: React.Ref<HTMLAnchorElement> }) {
  return <RouterNavLink ref={ref} className={cn(base, className)} {...props} />;
}
