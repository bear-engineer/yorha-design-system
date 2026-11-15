import type { ComponentProps } from "react";
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { Glyph } from "@/components/ui/glyph";
import { ChevronIcon } from "@/components/ui/icons";
import { cn, cnState } from "@/lib/utils";

type RootProps = ComponentProps<typeof NavigationMenuPrimitive.Root>;
type PositionerProps = ComponentProps<typeof NavigationMenuPrimitive.Positioner>;
type ViewportOptions = Pick<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding"> & {
  /** Portal mount node; defaults to document.body. */
  container?: ComponentProps<typeof NavigationMenuPrimitive.Portal>["container"];
  /** Accessible name for the popup landmark; set it when several menus share a page. */
  label?: string;
  /** Render a transparent full-screen Backdrop behind the popup. */
  backdrop?: boolean;
};

/** Hover timing, passed to the Base UI root: `delay` (ms before a hover opens a panel, default 50) and `closeDelay` (ms before leaving closes it, default 50). */
type NavigationMenuTimingProps = { delay?: number; closeDelay?: number };

/**
 * Root. Renders its children plus one shared popup (Portal, Positioner, Popup, Arrow, Viewport)
 * that every `NavigationMenuContent` morphs inside. Pass `viewport={false}` to compose
 * `NavigationMenuViewport` yourself.
 */
function NavigationMenu({
  className,
  children,
  viewport,
  ...props
}: RootProps & NavigationMenuTimingProps & { viewport?: false | ViewportOptions }) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cnState("max-w-full font-yorha text-yorha-fg", className)}
      {...props}
    >
      {children}
      {viewport === false ? null : <NavigationMenuViewport {...viewport} />}
    </NavigationMenuPrimitive.Root>
  );
}

/** Row of items. Left/Right move between triggers and links; Down or Enter opens a panel. */
function NavigationMenuList({ className, ...props }: ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cnState("relative m-0 flex list-none flex-wrap items-center gap-1 p-0", className)}
      {...props}
    />
  );
}

/** One entry: either a trigger with a content panel, or a plain link. */
function NavigationMenuItem({ className, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return <NavigationMenuPrimitive.Item data-slot="navigation-menu-item" className={className} {...props} />;
}

/** Opens its panel on hover, click or Enter/Space/ArrowDown. Includes the caret icon. */
function NavigationMenuTrigger({ className, children, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cnState(
        [
          "inline-flex h-control-sm cursor-default select-none items-center gap-2 px-pad-sm text-yorha-sm tracking-yorha-wide text-yorha-fg",
          "bg-linear-to-r from-yorha-ink to-yorha-ink bg-no-repeat bg-[position:left_center] bg-[length:0%_100%]",
          "yorha-wipe [--yorha-wipe-exit:0s]",
          "hover:bg-[length:100%_100%] hover:text-yorha-on-ink data-[popup-open]:bg-[length:100%_100%] data-[popup-open]:text-yorha-on-ink",
          "focus-visible:yorha-focus data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-disabled",
        ],
        className,
      )}
      {...props}
    >
      {children}
      <NavigationMenuIcon />
    </NavigationMenuPrimitive.Trigger>
  );
}

/** Caret that flips while the panel is open. Rotation is instant when motion is reduced. */
function NavigationMenuIcon({ className, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Icon>) {
  return (
    <NavigationMenuPrimitive.Icon
      data-slot="navigation-menu-icon"
      aria-hidden="true"
      className={cnState(
        "grid size-icon-sm place-items-center transition-transform duration-(--motion-popover) ease-yorha-out data-[popup-open]:rotate-180",
        className,
      )}
      {...props}
    >
      <ChevronIcon dir="down" />
    </NavigationMenuPrimitive.Icon>
  );
}

/**
 * Panel for one trigger. Slides sideways from the direction you came from (`data-activation-direction`)
 * and fades; under reduced motion it only fades.
 */
function NavigationMenuContent({ className, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cnState(
        [
          "h-full w-[calc(100dvw-40px)] max-w-[calc(100dvw-2rem)] py-1 min-[500px]:w-max min-[500px]:max-w-[400px]",
          "transition-[opacity,translate] duration-(--motion-shared-element) ease-yorha-emphasized",
          "[--shift:calc(50%*var(--motion-spatial))]",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          "data-[starting-style]:data-[activation-direction=left]:-translate-x-(--shift)",
          "data-[starting-style]:data-[activation-direction=right]:translate-x-(--shift)",
          "data-[ending-style]:data-[activation-direction=left]:translate-x-(--shift)",
          "data-[ending-style]:data-[activation-direction=right]:-translate-x-(--shift)",
        ],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Link in the bar or a panel. Renders a plain `<a>` by default; pass
 * `render={<NavLink to="/units" />}` from `@/components/nav-link` for client-side routing and
 * `aria-current="page"` on the active route. Selecting a link closes the panel.
 */
function NavigationMenuLink({ className, closeOnClick = true, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      closeOnClick={closeOnClick}
      className={cnState(
        [
          // One row recipe (G8). Links carry no data-highlighted: hover and keyboard focus draw the same fill.
          "yorha-row cursor-default text-yorha-sm tracking-yorha-body no-underline data-[active]:font-yorha-bold",
          "hover:[background-size:100%_100%] hover:text-yorha-on-ink hover:[transition-duration:var(--motion-press)]",
          "focus-visible:[background-size:100%_100%] focus-visible:text-yorha-on-ink focus-visible:[transition-duration:var(--motion-press)]",
          "forced-colors:focus-visible:outline-2 forced-colors:focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[Highlight]",
        ],
        className,
      )}
      {...props}
    />
  );
}

/** Shared popup. Size follows the active panel through `--positioner-*` / `--popup-*` (no layout transition); panels slide and fade, the popup itself uses the stepped `yorha-pop` reveal. */
function NavigationMenuViewport({
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset,
  collisionPadding = 8,
  container,
  label,
  backdrop = false,
}: ViewportOptions) {
  return (
    <NavigationMenuPrimitive.Portal container={container}>
      {backdrop ? <NavigationMenuBackdrop /> : null}
      <NavigationMenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        collisionAvoidance={{ side: "none" }}
        className={cn(
          "z-(--yorha-z-popover) h-(--positioner-height) w-(--positioner-width) max-w-(--available-width)",
          // No transition on top/left/width/height: they are layout properties. The positioner jumps to the new anchor and the panel content slides/fades.
          // hover bridge so the pointer can cross the gap to the popup
          "before:absolute before:content-[''] data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:-top-2 data-[side=bottom]:before:h-2",
          "data-[side=top]:before:inset-x-0 data-[side=top]:before:-bottom-2 data-[side=top]:before:h-2",
        )}
      >
        <NavigationMenuPrimitive.Popup
          data-slot="navigation-menu-popup"
          aria-label={label}
          className={cn(
            "yorha-pop relative h-(--popup-height) w-(--popup-width) border border-yorha-border bg-yorha-panel text-yorha-fg shadow-yorha-md rounded-yorha outline-none",
          )}
        >
          <NavigationMenuArrow />
          <NavigationMenuPrimitive.Viewport data-slot="navigation-menu-viewport" className="relative h-full w-full overflow-hidden" />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  );
}

/** Notch that points at the active trigger and follows it between panels. */
function NavigationMenuArrow({ className, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Arrow>) {
  return (
    <NavigationMenuPrimitive.Arrow
      data-slot="navigation-menu-arrow"
      className={cnState(
        "group/arrow block size-3 text-yorha-border data-[side=bottom]:top-[-8px] data-[side=top]:bottom-[-8px]",
        className,
      )}
      {...props}
    >
      <Glyph name="triangle-up" className="absolute inset-0 opacity-0 group-data-[side=bottom]/arrow:opacity-100" />
      <Glyph name="triangle-down" className="absolute inset-0 opacity-0 group-data-[side=top]/arrow:opacity-100" />
    </NavigationMenuPrimitive.Arrow>
  );
}

/** Transparent layer behind the popup (opt in with `viewport={{ backdrop: true }}`); a click on it closes the panel. */
function NavigationMenuBackdrop({ className, ...props }: ComponentProps<typeof NavigationMenuPrimitive.Backdrop>) {
  return (
    <NavigationMenuPrimitive.Backdrop
      data-slot="navigation-menu-backdrop"
      className={cnState("fixed inset-0 z-(--yorha-z-popover)", className)}
      {...props}
    />
  );
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuIcon,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuViewport,
  NavigationMenuArrow,
  NavigationMenuBackdrop,
};
