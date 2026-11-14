import type { ComponentProps } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { buttonVariants } from "@/components/ui/button";
import { cn, cnState } from "@/lib/utils";

/** Root: re-export of the Base UI Menu root (open, onOpenChange, modal, ...). */
const Menu = MenuPrimitive.Root;
/** Groups items so a label can name them. */
const MenuGroup = MenuPrimitive.Group;
/** Root of a nested menu; place it inside MenuContent next to a MenuSubTrigger. */
const MenuSub = MenuPrimitive.SubmenuRoot;
/** Radio items share a value through this group. */
const MenuRadioGroup = MenuPrimitive.RadioGroup;

// Selected row: dark fill wipes in left to right (--motion-select), text inverts,
// thin rules above and below (--menu-rule, 0 turns them off), arrow cursor at the left edge.
const ROW =
  "group/row relative flex min-h-8 cursor-default select-none items-center gap-3 py-1.5 pr-3 pl-9 outline-none focus-visible:yorha-focus " +
  "font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg " +
  "bg-linear-to-r from-yorha-ink to-yorha-ink bg-no-repeat bg-[position:left_center] bg-[length:0%_100%] " +
  "yorha-wipe " +
  "data-[highlighted]:bg-[length:100%_100%] data-[highlighted]:text-yorha-on-ink " +
  "data-[highlighted]:shadow-[0_calc(var(--menu-rule)*-1)_0_0_var(--yorha-ink),0_var(--menu-rule)_0_0_var(--yorha-ink)] " +
  "data-[highlighted]:z-1 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60 " +
  // arrow cursor (CSS triangle), only on the selected row
  "after:absolute after:top-1/2 after:left-2 after:size-0 after:-translate-y-1/2 after:border-y-[5px] after:border-l-[7px] " +
  "after:border-y-transparent after:border-l-current after:opacity-0 data-[highlighted]:after:opacity-100";

// Square bullet in currentColor: inverts with the row because the row text colour inverts.
const BULLET = "before:absolute before:top-1/2 before:left-5 before:size-1.5 before:-translate-y-1/2 before:bg-current";

type TriggerProps = ComponentProps<typeof MenuPrimitive.Trigger>;

/** Button that opens the menu. Enter, Space and ArrowDown open it; focus returns here on close. */
function MenuTrigger({ className, ...props }: TriggerProps) {
  return (
    <MenuPrimitive.Trigger
      data-slot="menu-trigger"
      className={cnState(buttonVariants(), className)}
      {...props}
    />
  );
}

type PositionerProps = ComponentProps<typeof MenuPrimitive.Positioner>;
type ContentProps = ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding"> & {
    /** Portal mount node; defaults to document.body. */
    container?: ComponentProps<typeof MenuPrimitive.Portal>["container"];
    /** Render a MenuBackdrop (scrim) behind the popup. Use with `modal` on the root. */
    backdrop?: boolean;
  };

const POPUP =
  "min-w-48 border border-yorha-border bg-yorha-panel py-1 text-yorha-fg shadow-yorha-md rounded-yorha outline-none " +
  "yorha-pop";

/** Popup in a portal. Arrows move the selected row, Enter activates, Escape closes and returns focus to the trigger. */
function MenuContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  alignOffset,
  collisionPadding = 8,
  container,
  backdrop = false,
  ...props
}: ContentProps) {
  return (
    <MenuPrimitive.Portal container={container}>
      {backdrop ? <MenuBackdrop /> : null}
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className="z-(--yorha-z-popover) outline-none"
      >
        <MenuPrimitive.Popup data-slot="menu-content" className={cnState(POPUP, className)} {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

const ARROW =
  "relative block h-1.5 w-3 overflow-clip " +
  "data-[side=bottom]:top-[-6px] data-[side=top]:bottom-[-6px] data-[side=top]:rotate-180 " +
  "data-[side=left]:right-[-9px] data-[side=left]:rotate-90 data-[side=right]:left-[-9px] data-[side=right]:-rotate-90 " +
  "before:absolute before:bottom-0 before:left-1/2 before:size-[calc(6px*1.4142)] before:border before:border-yorha-border " +
  "before:bg-yorha-panel before:content-[''] before:[transform:translate(-50%,50%)_rotate(45deg)]";

/** Pointer from the menu to its trigger. Render it inside MenuContent. */
function MenuArrow({ className, ...props }: ComponentProps<typeof MenuPrimitive.Arrow>) {
  return <MenuPrimitive.Arrow data-slot="menu-arrow" className={cnState(ARROW, className)} {...props} />;
}

// Popup scrims fade with the popover tokens (not the 400ms panel ones); `pointer-events-none` while ending so a click
// right after Esc reaches what is underneath instead of the fading scrim.
const SCRIM =
  "fixed inset-0 z-(--yorha-z-overlay) bg-yorha-scrim " +
  "[transition-property:opacity] [transition-duration:max(var(--motion-popover),var(--motion-reduced-fade))] [transition-timing-function:var(--yorha-ease-decelerate)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:pointer-events-none data-[ending-style]:[transition-duration:max(var(--motion-popover-exit),var(--motion-reduced-fade))] data-[ending-style]:[transition-timing-function:var(--yorha-ease-in)]";

/** Scrim behind the menu (use with `modal`). Fades with `yorha-fade`. */
function MenuBackdrop({ className, ...props }: ComponentProps<typeof MenuPrimitive.Backdrop>) {
  return (
    <MenuPrimitive.Backdrop
      data-slot="menu-backdrop"
      className={cnState(SCRIM, className)}
      {...props}
    />
  );
}

/** Wrap the content of a menu with several triggers (one handle) so it cross-fades between them. */
function MenuViewport({ className, ...props }: ComponentProps<typeof MenuPrimitive.Viewport>) {
  return (
    <MenuPrimitive.Viewport
      data-slot="menu-viewport"
      className={cnState("relative h-full w-full overflow-clip [&_[data-current]]:yorha-fade [&_[data-previous]]:yorha-fade", className)}
      {...props}
    />
  );
}

/** Handle for a trigger placed outside `<Menu>`: pass the same handle to MenuTrigger and Menu. */
const createMenuHandle = MenuPrimitive.createHandle;
type MenuHandle<Payload = unknown> = MenuPrimitive.Handle<Payload>;

/** Wrap `<Menu>` in this to enable filtering with MenuInput, MenuList, MenuEmpty and MenuClear. */
const MenuFilterProvider = MenuPrimitive.FilterProvider;

/** Filter field at the top of the popup. Label it with `aria-label`. ArrowDown moves into the rows. */
function MenuInput({ className, ...props }: ComponentProps<typeof MenuPrimitive.Input>) {
  return (
    <MenuPrimitive.Input
      data-slot="menu-input"
      className={cnState(
        "mx-1 mb-1 block h-8 w-[calc(100%-0.5rem)] rounded-yorha border border-yorha-border bg-yorha-bg px-2 font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg placeholder:text-yorha-fg-soft focus-visible:yorha-focus",
        className,
      )}
      {...props}
    />
  );
}

/** Empties the filter field. Hidden by Base UI while the field is empty. */
function MenuClear({ className, ...props }: ComponentProps<typeof MenuPrimitive.Clear>) {
  return (
    <MenuPrimitive.Clear
      data-slot="menu-clear"
      className={cnState(
        "mx-1 mb-1 min-h-6 cursor-pointer rounded-yorha border border-yorha-border px-2 font-yorha text-yorha-xs tracking-yorha-body text-yorha-fg hover:bg-yorha-ink hover:text-yorha-on-ink focus-visible:yorha-focus",
        className,
      )}
      {...props}
    />
  );
}

/** Shown when the filter matches nothing. */
function MenuEmpty({ className, ...props }: ComponentProps<typeof MenuPrimitive.Empty>) {
  return (
    <MenuPrimitive.Empty
      data-slot="menu-empty"
      className={cnState("px-3 py-2 font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg-soft empty:hidden", className)}
      {...props}
    />
  );
}

/** Container for the filterable rows (required inside a filtered menu; also valid in a plain one). */
function MenuList({ className, ...props }: ComponentProps<typeof MenuPrimitive.List>) {
  return <MenuPrimitive.List data-slot="menu-list" className={cnState("outline-none", className)} {...props} />;
}

/** Row that navigates: renders an `<a>`. Same selected-row look as MenuItem. */
function MenuLinkItem({ className, ...props }: ComponentProps<typeof MenuPrimitive.LinkItem>) {
  return <MenuPrimitive.LinkItem data-slot="menu-link-item" className={cnState([ROW, BULLET], className)} {...props} />;
}

/** Plain action row. */
function MenuItem({ className, ...props }: ComponentProps<typeof MenuPrimitive.Item>) {
  return <MenuPrimitive.Item data-slot="menu-item" className={cnState([ROW, BULLET], className)} {...props} />;
}

/** Row that opens a submenu. ArrowRight opens, ArrowLeft or Escape closes. */
function MenuSubTrigger({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.SubmenuTrigger>) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="menu-sub-trigger"
      className={cnState([ROW, BULLET, "data-[popup-open]:bg-[length:100%_100%] data-[popup-open]:text-yorha-on-ink"], className)}
      {...props}
    >
      {children}
      <span aria-hidden="true" className="ml-auto border-y-[4px] border-l-[5px] border-y-transparent border-l-current" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

// Boxes in the bullet slot: square (checkbox) vs diamond (radio), so the kind is not colour-only.
const BOX = "absolute top-1/2 left-5 flex size-2.5 -translate-y-1/2 items-center justify-center border border-current";

/** Toggle row (role menuitemcheckbox). Stays open after toggling by default. */
function MenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem data-slot="menu-checkbox-item" className={cnState(ROW, className)} {...props}>
      <span aria-hidden="true" className={BOX}>
        <MenuPrimitive.CheckboxItemIndicator keepMounted className="size-1.5 bg-current data-[unchecked]:hidden" />
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

/** Single-choice row (role menuitemradio); use inside MenuRadioGroup. */
function MenuRadioItem({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem data-slot="menu-radio-item" className={cnState(ROW, className)} {...props}>
      <span aria-hidden="true" className={cn(BOX, "rotate-45")}>
        <MenuPrimitive.RadioItemIndicator keepMounted className="size-1 bg-current data-[unchecked]:hidden" />
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

/** Group heading: uppercase, widely tracked. */
function MenuLabel({ className, ...props }: ComponentProps<typeof MenuPrimitive.GroupLabel>) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-label"
      className={cnState("px-3 py-1.5 font-yorha-bold text-yorha-xs tracking-yorha-heading text-yorha-fg-soft uppercase", className)}
      {...props}
    />
  );
}

/** Rule between groups. */
function MenuSeparator({ className, ...props }: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      className={cnState("my-1 h-px bg-yorha-separator", className)}
      {...props}
    />
  );
}

/** Shortcut hint pushed to the right edge of a row. Text only; it does not bind keys. */
function MenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="menu-shortcut"
      className={cn("ml-auto pl-6 font-yorha-mono text-yorha-xs tracking-yorha-wide text-current opacity-80", className)}
      {...props}
    />
  );
}

export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuGroup,
  MenuLabel,
  MenuShortcut,
  MenuArrow,
  MenuBackdrop,
  MenuViewport,
  MenuFilterProvider,
  MenuInput,
  MenuClear,
  MenuEmpty,
  MenuList,
  MenuLinkItem,
  createMenuHandle,
};
export type { MenuHandle };
