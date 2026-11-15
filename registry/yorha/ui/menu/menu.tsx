import { Children, createContext, isValidElement, useContext, type ComponentProps, type ReactNode } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { buttonVariants } from "@/components/ui/button";
import { Glyph } from "@/components/ui/glyph";
import { TriangleIcon } from "@/components/ui/icons";
import { KbdCombo, useShortcut } from "@/components/ui/kbd";
import { cn, cnState } from "@/lib/utils";

/**
 * Migration (v4 sel-b): the arrow is a pixel triangle glyph (no rotated box); the popup body is a scroll viewport
 * (`data-slot="menu-scroll"`, capped to the available height, `yorha-scroll-cue-y`), so `MenuArrow` is rendered beside it, not inside;
 * `MenuItem shortcut="mod+S"` shows a `KbdCombo` and sets `aria-keyshortcuts` (display only, it binds nothing; new dependency `@yorha/kbd`, `@yorha/glyph`).
 *
 * Migration (v3 sel): nested content opens to the side (`MenuSubContent` is the explicit name; no `side`/`align` needed);
 * action rows carry no bullet (only check/radio rows reserve the indicator slot, which renders no children);
 * the cursor and submenu chevron are `TriangleIcon` from `@yorha/icons` (new dependency of menu, context-menu,
 * menubar, menu-list and navigation-menu). Custom indicator children are no longer rendered.
 */
/** Root: re-export of the Base UI Menu root (open, onOpenChange, modal, ...). */
const Menu = MenuPrimitive.Root;
/** Groups items so a label can name them. */
const MenuGroup = MenuPrimitive.Group;
// Content rendered inside a MenuSub is a submenu: it opens beside its trigger row, not below it (FSEL-01).
const SubContext = createContext(false);

/** True inside a MenuSub: wrappers (Menubar) use it to keep the submenu defaults. */
const useMenuIsSub = () => useContext(SubContext);

/** Root of a nested menu; place it inside MenuContent next to a MenuSubTrigger. Its content opens to the side. */
function MenuSub(props: ComponentProps<typeof MenuPrimitive.SubmenuRoot>) {
  return (
    <SubContext.Provider value>
      <MenuPrimitive.SubmenuRoot {...props} />
    </SubContext.Provider>
  );
}
/** Radio items share a value through this group. */
const MenuRadioGroup = MenuPrimitive.RadioGroup;

// One row recipe (`yorha-row`, G8): 4px block padding on the row token, full-bleed ink fill that wipes in over 90ms and
// drops at once, no ring (the fill is the focus indicator), `Highlight` outline under forced colours.
// Anatomy: cursor gutter, indicator slot (only in popups that hold check/radio rows), label, trailing shortcut/chevron.
const ROW =
  "group/row yorha-row cursor-default font-yorha text-yorha-sm tracking-yorha-body " +
  "data-[popup-open]:bg-[length:100%_100%] data-[popup-open]:text-yorha-on-ink " +
  // The band is the focus indicator: the on-ink inset frame of `yorha-row` would read as a lighter seam inside it.
  "[&[data-highlighted]:focus-visible:not([data-disabled])]:outline-[var(--yorha-ink)]";

/** Cursor + indicator slot + label wrapper shared by every row. */
function RowBody({ indicator, children }: { indicator?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <TriangleIcon data-slot="row-cursor" className="size-icon-sm opacity-0 group-data-[highlighted]/row:opacity-100 group-data-[popup-open]/row:opacity-100" />
      <span data-slot="row-indicator" className="grid size-indicator shrink-0 place-items-center">
        {indicator}
      </span>
      <span data-slot="row-label" className="flex min-w-0 flex-1 items-center">
        {children}
      </span>
    </>
  );
}

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

const SCROLL = "yorha-scroll yorha-scroll-cue-y [--yorha-scroll-ground:var(--yorha-panel)] max-h-[calc(var(--available-height)-10px)]";

const POPUP =
  "min-w-56 border border-yorha-border bg-yorha-panel py-1 text-yorha-fg shadow-yorha-md rounded-yorha outline-none " +
  "yorha-pop";

/** Popup in a portal. Arrows move the selected row, Enter activates, Escape closes and returns focus to the trigger. */
function MenuContent({
  className,
  side: sideProp,
  align = "start",
  sideOffset: sideOffsetProp,
  alignOffset: alignOffsetProp,
  collisionPadding = 8,
  container,
  backdrop = false,
  children,
  ...props
}: ContentProps) {
  // Nested content (inside MenuSub) opens beside its trigger: first row lines up with the trigger row (-4 = popup padding).
  const nested = useContext(SubContext);
  const side = sideProp ?? (nested ? "inline-end" : "bottom");
  const sideOffset = sideOffsetProp ?? (nested ? -1 : 8);
  const alignOffset = alignOffsetProp ?? (nested ? -4 : undefined);
  // The arrow sits outside the scroll body (a scroll container would clip it).
  const kids = Children.toArray(children);
  const isArrow = (k: ReactNode) => isValidElement(k) && k.type === MenuArrow;
  const arrows = kids.filter(isArrow);
  const body = kids.filter((k) => !isArrow(k));
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
        <MenuPrimitive.Popup data-slot="menu-content" className={cnState(POPUP, className)} {...props}>
          {arrows}
          <div data-slot="menu-scroll" className={SCROLL}>
            {body}
          </div>
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

// Pixel arrow: one 12px triangle glyph per side (crispEdges, no rotation), stacked in one 12px box and shown by the arrow's `data-side`.
// The glyph's base row sits over the popup edge so it merges with the border; `text-*` picks the fill.
function ArrowGlyphs() {
  return (
    <>
      <Glyph name="triangle-up" className="absolute inset-0 opacity-0 group-data-[side=bottom]/arrow:opacity-100" />
      <Glyph name="triangle-down" className="absolute inset-0 opacity-0 group-data-[side=top]/arrow:opacity-100" />
      <Glyph name="triangle-right" className="absolute inset-0 opacity-0 group-data-[side=left]/arrow:opacity-100" />
      <Glyph name="triangle-left" className="absolute inset-0 opacity-0 group-data-[side=right]/arrow:opacity-100" />
    </>
  );
}

const ARROW =
  "group/arrow block size-3 text-yorha-border data-[side=bottom]:top-[-8px] data-[side=top]:bottom-[-8px] data-[side=left]:right-[-8px] data-[side=right]:left-[-8px]";

/** Pointer from the menu to its trigger. Render it inside MenuContent. */
function MenuArrow({ className, ...props }: ComponentProps<typeof MenuPrimitive.Arrow>) {
  return <MenuPrimitive.Arrow data-slot="menu-arrow" className={cnState(ARROW, className)} {...props}>
      <ArrowGlyphs />
    </MenuPrimitive.Arrow>;
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

/** Content of a submenu. Same as MenuContent inside a MenuSub (which already opens to the side); explicit for clarity. */
function MenuSubContent(props: ContentProps) {
  return (
    <SubContext.Provider value>
      <MenuContent {...props} />
    </SubContext.Provider>
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
        "mx-1 mb-1 block h-control-sm w-[calc(100%-0.5rem)] rounded-yorha border border-yorha-border bg-yorha-bg px-2 font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg placeholder:text-yorha-fg-soft focus-visible:yorha-focus",
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
        "mx-1 mb-1 h-control-sm cursor-pointer rounded-yorha border border-yorha-border px-2 font-yorha text-yorha-xs tracking-yorha-body text-yorha-fg hover:bg-yorha-ink hover:text-yorha-on-ink focus-visible:yorha-focus",
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
      className={cnState("px-3 py-3 text-center font-yorha text-yorha-sm tracking-yorha-body text-pretty text-yorha-fg-soft empty:hidden", className)}
      {...props}
    />
  );
}

/** Container for the filterable rows (required inside a filtered menu; also valid in a plain one). */
function MenuList({ className, ...props }: ComponentProps<typeof MenuPrimitive.List>) {
  return <MenuPrimitive.List data-slot="menu-list" className={cnState("outline-none", className)} {...props} />;
}

/** Row that navigates: renders an `<a>`. Same selected-row look as MenuItem. */
function MenuLinkItem({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.LinkItem>) {
  return (
    <MenuPrimitive.LinkItem data-slot="menu-link-item" className={cnState(ROW, className)} {...props}>
      <RowBody>{children}</RowBody>
    </MenuPrimitive.LinkItem>
  );
}

/** Plain action row. No bullet: only check and radio rows carry an indicator. */
function MenuItem({ className, children, shortcut, ...props }: ComponentProps<typeof MenuPrimitive.Item> & { shortcut?: string }) {
  const keys = shortcut ? shortcut.split("+").filter(Boolean) : [];
  // Display only: `enabled: false` returns the aria value without binding a listener.
  const aria = useShortcut(keys, () => {}, { enabled: false });
  return (
    <MenuPrimitive.Item data-slot="menu-item" className={cnState(ROW, className)} aria-keyshortcuts={shortcut ? aria["aria-keyshortcuts"] : undefined} {...props}>
      <RowBody>{children}</RowBody>
      {shortcut ? <MenuShortcut className="opacity-100"><KbdCombo keys={keys} className="[&_kbd]:h-4 [&_kbd]:min-w-4 [&_kbd]:px-1 [&_kbd]:leading-[13px]" /></MenuShortcut> : null}
    </MenuPrimitive.Item>
  );
}

/** Row that opens a submenu. ArrowRight opens, ArrowLeft or Escape closes. */
function MenuSubTrigger({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.SubmenuTrigger>) {
  return (
    <MenuPrimitive.SubmenuTrigger data-slot="menu-sub-trigger" className={cnState(ROW, className)} {...props}>
      <RowBody>{children}</RowBody>
      <TriangleIcon data-slot="row-chevron" className="size-icon-sm" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

// Boxes in the indicator slot: square (checkbox) vs diamond (radio), so the kind is not colour-only.
const BOX = "grid size-2.5 place-items-center border border-current";

/** Toggle row (role menuitemcheckbox). Stays open after toggling by default. */
function MenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem data-slot="menu-checkbox-item" className={cnState(ROW, className)} {...props}>
      <RowBody
        indicator={
          <span aria-hidden="true" className={BOX}>
            <MenuPrimitive.CheckboxItemIndicator keepMounted className="size-1.5 bg-current data-[unchecked]:hidden" />
          </span>
        }
      >
        {children}
      </RowBody>
    </MenuPrimitive.CheckboxItem>
  );
}

/** Single-choice row (role menuitemradio); use inside MenuRadioGroup. */
function MenuRadioItem({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem data-slot="menu-radio-item" className={cnState(ROW, className)} {...props}>
      <RowBody
        indicator={
          <span aria-hidden="true" className="relative block size-3">
            <Glyph name="diamond-ring" className="absolute inset-0" />
            <MenuPrimitive.RadioItemIndicator keepMounted className="absolute inset-0 data-[unchecked]:hidden">
              <Glyph name="diamond-dot" />
            </MenuPrimitive.RadioItemIndicator>
          </span>
        }
      >
        {children}
      </RowBody>
    </MenuPrimitive.RadioItem>
  );
}

/** Group heading: uppercase, widely tracked. */
function MenuLabel({ className, ...props }: ComponentProps<typeof MenuPrimitive.GroupLabel>) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-label"
      className={cnState("px-2 py-1.5 font-yorha-bold text-yorha-xs tracking-yorha-heading text-yorha-fg-soft uppercase", className)}
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
      className={cn("ml-auto pl-6 font-yorha-mono text-yorha-xs tracking-yorha-wide text-current yorha-tabular opacity-80", className)}
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
  MenuSubContent,
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
  useMenuIsSub,
};
export type { MenuHandle };
