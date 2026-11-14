import type { ComponentProps } from "react";
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
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
}: RootProps & { viewport?: false | ViewportOptions }) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cnState("min-w-max font-yorha text-yorha-fg", className)}
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
      className={cnState("relative m-0 flex list-none items-center gap-1 p-0", className)}
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
          "inline-flex h-8 cursor-default select-none items-center gap-2 px-3 text-yorha-sm tracking-yorha-wide text-yorha-fg",
          "bg-linear-to-r from-yorha-ink to-yorha-ink bg-no-repeat bg-[position:left_center] bg-[length:0%_100%]",
          "transition-[background-size,color] duration-(--motion-select) ease-yorha-out",
          "hover:bg-[length:100%_100%] hover:text-yorha-on-ink data-[popup-open]:bg-[length:100%_100%] data-[popup-open]:text-yorha-on-ink",
          "focus-visible:yorha-focus data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60",
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
        "flex size-3 items-center justify-center transition-transform duration-(--motion-popover) ease-yorha-out data-[popup-open]:rotate-180",
        className,
      )}
      {...props}
    >
      <span className="border-x-[5px] border-t-[6px] border-x-transparent border-t-current" />
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
          "h-full w-[calc(100dvw-40px)] p-2 min-[500px]:w-max min-[500px]:max-w-[400px]",
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
        "focus-visible:yorha-focus data-[active]:font-yorha-bold",
        className,
      )}
      {...props}
    />
  );
}

/** Shared popup. Size follows the active panel through `--positioner-*` / `--popup-*` (no layout transition); panels slide and fade, the popup itself fades and scales. */
function NavigationMenuViewport({
  side = "bottom",
  align = "start",
  sideOffset = 10,
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
          "before:absolute before:content-[''] data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:-top-2.5 data-[side=bottom]:before:h-2.5",
          "data-[side=top]:before:inset-x-0 data-[side=top]:before:-bottom-2.5 data-[side=top]:before:h-2.5",
        )}
      >
        <NavigationMenuPrimitive.Popup
          data-slot="navigation-menu-popup"
          aria-label={label}
          className={cn(
            "relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) border border-yorha-border bg-yorha-panel text-yorha-fg shadow-yorha-md rounded-yorha outline-none",
            "transition-[opacity,scale] [transition-duration:max(var(--motion-shared-element),var(--motion-reduced-fade))] ease-yorha-emphasized",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-(--pop-scale)",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-(--pop-scale) data-[ending-style]:duration-(--motion-popover-exit) data-[ending-style]:ease-yorha-in",
            "[--pop-scale:calc(1_-_(1_-_var(--motion-scale-pop))_*_var(--motion-spatial))]",
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
        [
          "relative block h-1.5 w-3 overflow-clip",
          "before:absolute before:bottom-0 before:left-1/2 before:block before:size-[calc(6px*1.4142)] before:-translate-x-1/2 before:translate-y-1/2 before:rotate-45",
          "before:border before:border-yorha-border before:bg-yorha-panel before:content-['']",
          "data-[side=bottom]:-top-1.5 data-[side=top]:-bottom-1.5 data-[side=top]:rotate-180",
        ],
        className,
      )}
      {...props}
    />
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
