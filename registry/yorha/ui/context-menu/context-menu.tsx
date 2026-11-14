import type { ComponentProps } from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { cn, cnState } from "@/lib/utils";

/**
 * Class strings, written in this file on purpose (menu-like look, no import from the menu item).
 * Motion: popup = `yorha-pop` (T3 utility, scale+opacity from --transform-origin; opacity-only under reduced, none under off).
 */
export const contextMenuStyles = {
  popup:
    "yorha-pop min-w-48 rounded-yorha border border-yorha-border bg-yorha-panel py-1 text-yorha-fg shadow-yorha-md outline-none",
  // Selected row: dark fill, inverted text, arrow cursor at the left edge, square bullet in currentColor.
  item:
    "relative flex min-h-8 cursor-default select-none items-center gap-3 py-1.5 pr-3 pl-9 outline-none focus-visible:yorha-focus " +
    "font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg " +
    "data-[highlighted]:bg-yorha-ink data-[highlighted]:text-yorha-on-ink " +
    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60 " +
    "before:absolute before:top-1/2 before:left-5 before:size-1.5 before:-translate-y-1/2 before:bg-current " +
    "after:absolute after:top-1/2 after:left-2 after:size-0 after:-translate-y-1/2 after:border-y-[5px] after:border-l-[7px] " +
    "after:border-y-transparent after:border-l-current after:opacity-0 data-[highlighted]:after:opacity-100",
  // box in the bullet slot: square (checkbox) vs diamond (radio) so the kind is not colour-only
  box: "absolute top-1/2 left-5 flex size-2.5 -translate-y-1/2 items-center justify-center border border-current",
  label: "px-3 py-1.5 font-yorha-bold text-yorha-xs tracking-yorha-heading text-yorha-fg-soft uppercase",
  separator: "my-1 h-px bg-yorha-separator",
  arrow:
    "size-2.5 rotate-45 border-yorha-border bg-yorha-panel " +
    "data-[side=bottom]:top-[-6px] data-[side=bottom]:border-t data-[side=bottom]:border-l " +
    "data-[side=top]:bottom-[-6px] data-[side=top]:border-r data-[side=top]:border-b " +
    "data-[side=left]:right-[-6px] data-[side=left]:border-t data-[side=left]:border-r " +
    "data-[side=right]:left-[-6px] data-[side=right]:border-b data-[side=right]:border-l",
};

/** Root: Base UI ContextMenu root (open, onOpenChange, ...). */
const ContextMenu = ContextMenuPrimitive.Root;
/** Groups items so a label can name them. */
const ContextMenuGroup = ContextMenuPrimitive.Group;
/** Root of a nested menu; place it inside ContextMenuContent next to a ContextMenuSubTrigger. */
const ContextMenuSub = ContextMenuPrimitive.SubmenuRoot;
/** Radio items share a value through this group. */
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

/**
 * Area that opens the menu on right click or long press. It is focusable (tabIndex 0) so the keyboard can reach it:
 * Shift+F10 and the ContextMenu key open the menu at the area (the key is handled here because browsers differ in
 * whether they fire `contextmenu` for it). Give it an accessible name (aria-label or visible text).
 */
function ContextMenuTrigger({ className, onKeyDown, tabIndex = 0, ...props }: ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  const handleKeyDown = (event: Parameters<NonNullable<ComponentProps<typeof ContextMenuPrimitive.Trigger>["onKeyDown"]>>[0]) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: rect.left + Math.min(rect.width / 2, 24),
          clientY: rect.top + Math.min(rect.height / 2, 24),
        }),
      );
    }
  };
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      tabIndex={tabIndex}
      onKeyDown={handleKeyDown}
      className={cnState("focus-visible:yorha-focus", className)}
      {...props}
    />
  );
}

type PositionerProps = ComponentProps<typeof ContextMenuPrimitive.Positioner>;
type ContentProps = ComponentProps<typeof ContextMenuPrimitive.Popup> &
  Pick<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding"> & {
    /** Render the pointing arrow. Default false (a menu at the pointer rarely needs one). */
    arrow?: boolean;
    /** Render the transparent click-catcher behind the menu. Default false. */
    backdrop?: boolean;
    /** Portal mount node; defaults to document.body. */
    container?: ComponentProps<typeof ContextMenuPrimitive.Portal>["container"];
  };

/** Popup in a portal. Arrows move the selected row, Enter activates, Escape closes and returns focus to the trigger. */
function ContextMenuContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  alignOffset,
  collisionPadding = 8,
  arrow = false,
  backdrop = false,
  container,
  ...props
}: ContentProps) {
  return (
    <ContextMenuPrimitive.Portal container={container}>
      {backdrop && <ContextMenuPrimitive.Backdrop className="fixed inset-0 z-(--yorha-z-popover)" />}
      <ContextMenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className="z-(--yorha-z-popover) outline-none"
      >
        <ContextMenuPrimitive.Popup data-slot="context-menu-content" className={cnState(contextMenuStyles.popup, className)} {...props}>
          {arrow && <ContextMenuPrimitive.Arrow data-slot="context-menu-arrow" aria-hidden="true" className={contextMenuStyles.arrow} />}
          {children}
        </ContextMenuPrimitive.Popup>
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}

/** Plain action row. */
function ContextMenuItem({ className, ...props }: ComponentProps<typeof ContextMenuPrimitive.Item>) {
  return <ContextMenuPrimitive.Item data-slot="context-menu-item" className={cnState(contextMenuStyles.item, className)} {...props} />;
}

/** Row that navigates (renders an `<a>`). */
function ContextMenuLinkItem({ className, ...props }: ComponentProps<typeof ContextMenuPrimitive.LinkItem>) {
  return <ContextMenuPrimitive.LinkItem data-slot="context-menu-link-item" className={cnState(contextMenuStyles.item, className)} {...props} />;
}

/** Row that opens a submenu. ArrowRight opens, ArrowLeft or Escape closes. */
function ContextMenuSubTrigger({ className, children, ...props }: ComponentProps<typeof ContextMenuPrimitive.SubmenuTrigger>) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      data-slot="context-menu-sub-trigger"
      className={cnState([contextMenuStyles.item, "data-[popup-open]:bg-yorha-ink data-[popup-open]:text-yorha-on-ink"], className)}
      {...props}
    >
      {children}
      <span aria-hidden="true" className="ml-auto border-y-[4px] border-l-[5px] border-y-transparent border-l-current" />
    </ContextMenuPrimitive.SubmenuTrigger>
  );
}

/** Toggle row (role menuitemcheckbox). */
function ContextMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem data-slot="context-menu-checkbox-item" className={cnState(contextMenuStyles.item, className)} {...props}>
      <span aria-hidden="true" className={contextMenuStyles.box}>
        <ContextMenuPrimitive.CheckboxItemIndicator keepMounted className="size-1.5 bg-current data-[unchecked]:hidden" />
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

/** Single-choice row (role menuitemradio); use inside ContextMenuRadioGroup. */
function ContextMenuRadioItem({ className, children, ...props }: ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem data-slot="context-menu-radio-item" className={cnState(contextMenuStyles.item, className)} {...props}>
      <span aria-hidden="true" className={cn(contextMenuStyles.box, "rotate-45")}>
        <ContextMenuPrimitive.RadioItemIndicator keepMounted className="size-1 bg-current data-[unchecked]:hidden" />
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

/** Group heading: uppercase, widely tracked. */
function ContextMenuLabel({ className, ...props }: ComponentProps<typeof ContextMenuPrimitive.GroupLabel>) {
  return <ContextMenuPrimitive.GroupLabel data-slot="context-menu-label" className={cnState(contextMenuStyles.label, className)} {...props} />;
}

/** Rule between groups. */
function ContextMenuSeparator({ className, ...props }: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return <ContextMenuPrimitive.Separator data-slot="context-menu-separator" className={cnState(contextMenuStyles.separator, className)} {...props} />;
}

/** Shortcut hint pushed to the right edge of a row. Text only; it does not bind keys. */
function ContextMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn("ml-auto pl-6 font-yorha-mono text-yorha-xs tracking-yorha-wide text-current", className)}
      {...props}
    />
  );
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLinkItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuShortcut,
};
