import { createContext, useContext } from "react";
import type { ComponentProps } from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { buttonVariants } from "@/components/ui/button";
import { cn, cnState } from "@/lib/utils";

type Side = "top" | "right" | "bottom" | "left";

// Side -> [slide utility, swipe direction that dismisses]. The utility name is the travel direction while opening.
const SIDES: Record<Side, { slide: string; swipe: "up" | "right" | "down" | "left"; place: string; popup: string }> = {
  bottom: {
    slide: "yorha-slide-up",
    swipe: "down",
    place: "items-end justify-center",
    popup:
      "w-full max-h-[85dvh] border-t [padding-bottom:max(0px,calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px)))]",
  },
  top: { slide: "yorha-slide-down", swipe: "up", place: "items-start justify-center", popup: "w-full max-h-[85dvh] border-b" },
  right: { slide: "yorha-slide-left", swipe: "right", place: "items-stretch justify-end", popup: "h-full w-96 max-w-[85vw] border-l" },
  left: { slide: "yorha-slide-right", swipe: "left", place: "items-stretch justify-start", popup: "h-full w-96 max-w-[85vw] border-r" },
};

/**
 * Class strings shared by the parts and static previews (one definition).
 * Motion: backdrop = `yorha-fade`; popup = `yorha-slide-*` (T3 utilities). The utilities read Base UI's
 * `--drawer-swipe-movement-x/-y`, `--drawer-snap-point-offset`, `--drawer-swipe-strength` and `data-swiping`.
 */
export const drawerStyles = {
  backdrop:
    "yorha-fade [--motion-panel-exit:var(--motion-drawer-exit)] fixed inset-0 z-(--yorha-z-overlay) bg-yorha-scrim " +
    "opacity-[calc(1-var(--drawer-swipe-progress,0))] data-[swiping]:[transition-duration:0s]",
  viewport: "fixed inset-0 z-(--yorha-z-modal) flex touch-none",
  surface:
    "border-yorha-border bg-yorha-panel text-yorha-fg shadow-yorha-lg font-yorha text-yorha-sm tracking-yorha-body",
  popup:
    "group/drawer relative z-1 flex min-h-0 flex-col overflow-visible outline-none focus-visible:yorha-focus touch-none data-[swiping]:select-none",
  title:
    "flex items-center gap-3 bg-yorha-ink px-4 py-2 font-yorha font-yorha-bold text-yorha-sm uppercase " +
    "tracking-yorha-heading text-yorha-on-ink " +
    "before:size-2 before:shrink-0 before:bg-current before:content-[''] " +
    "after:h-px after:flex-1 after:bg-yorha-on-ink-soft after:content-['']",
  body: "min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain px-6 py-5",
  description: "text-yorha-base leading-yorha-body text-yorha-fg-strong",
  footer:
    "flex shrink-0 flex-wrap justify-end gap-3 border-t border-dotted border-yorha-separator px-6 py-4 " +
    "pb-[calc(1rem+env(safe-area-inset-bottom,0px)+var(--drawer-keyboard-inset,0px))]",
  grip: "mx-auto mt-3 h-1 w-12 shrink-0 bg-yorha-separator",
};

const SideContext = createContext<Side>("right");

type RootProps = Omit<ComponentProps<typeof DrawerPrimitive.Root>, "swipeDirection"> & {
  /** Edge the drawer slides from. Sets Base UI's swipeDirection (the way out). Default right. */
  side?: Side;
};

/**
 * Root. Wraps Base UI Drawer.Root: `side` picks the slide utility and swipe direction;
 * `snapPoints`/`snapPoint`/`onSnapPointChange` work with side="bottom". Nested drawers stack when a Drawer sits inside DrawerContent.
 */
function Drawer({ side = "right", ...props }: RootProps) {
  return (
    <SideContext.Provider value={side}>
      <DrawerPrimitive.Root swipeDirection={SIDES[side].swipe} {...props} />
    </SideContext.Provider>
  );
}

/** Handle for a trigger placed outside `<Drawer>`: pass the same handle to `DrawerTrigger` and `Drawer`. */
const createDrawerHandle = DrawerPrimitive.createHandle;
type DrawerHandle<Payload = unknown> = DrawerPrimitive.Handle<Payload>;

/** Button that opens the drawer. Enter/Space; focus returns here on close. Styled as the Button component. */
function DrawerTrigger({ className, ...props }: ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" className={cnState(buttonVariants(), className)} {...props} />;
}

/** Invisible edge zone: swiping from the edge opens the drawer. Direction defaults to the opposite of the drawer's swipe-out direction. */
function DrawerSwipeArea({ className, ...props }: ComponentProps<typeof DrawerPrimitive.SwipeArea>) {
  return (
    <DrawerPrimitive.SwipeArea
      data-slot="drawer-swipe-area"
      className={cnState("fixed z-(--yorha-z-overlay) data-[swipe-direction=left]:inset-y-0 data-[swipe-direction=left]:right-0 data-[swipe-direction=left]:w-4 data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:left-0 data-[swipe-direction=right]:w-4 data-[swipe-direction=up]:inset-x-0 data-[swipe-direction=up]:bottom-0 data-[swipe-direction=up]:h-4 data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:top-0 data-[swipe-direction=down]:h-4", className)}
      {...props}
    />
  );
}

/** Groups drawers so IndentBackground/Indent can react to any drawer being open. Renders no element. */
const DrawerProvider = DrawerPrimitive.Provider;

/** Black layer behind DrawerIndent. */
function DrawerIndentBackground({ className, ...props }: ComponentProps<typeof DrawerPrimitive.IndentBackground>) {
  return <DrawerPrimitive.IndentBackground data-slot="drawer-indent-background" className={cnState("absolute inset-0 bg-yorha-ink", className)} {...props} />;
}

/** App content that recedes (moves down slightly) while a drawer is open; follows swipe progress. */
function DrawerIndent({ className, ...props }: ComponentProps<typeof DrawerPrimitive.Indent>) {
  return (
    <DrawerPrimitive.Indent
      data-slot="drawer-indent"
      className={cnState(
        [
          "relative origin-top bg-yorha-panel",
          // 1 at rest, 0 while a swipe is in progress so the content tracks the finger without lag
          "[--indent-transition:calc(1-clamp(0,calc(var(--drawer-swipe-progress,0)*100000),1))]",
          "transition-[translate] duration-[calc(var(--motion-drawer)*var(--indent-transition))] ease-yorha-emphasized",
          "data-[active]:[translate:0_calc(var(--motion-shift)*var(--motion-spatial)*(1-var(--drawer-swipe-progress,0)))]",
        ],
        className,
      )}
      {...props}
    />
  );
}

/** Wrap the DrawerContent in this (or pass `keyboardAware`) so bottom sheets with fields stay above the software keyboard. Exposes `--drawer-keyboard-inset`. */
const DrawerVirtualKeyboardProvider = DrawerPrimitive.VirtualKeyboardProvider;

type ContentProps = ComponentProps<typeof DrawerPrimitive.Popup> & {
  /** Manage focus and scroll for software keyboards (wraps Drawer.VirtualKeyboardProvider). */
  keyboardAware?: boolean;
  /** Portal mount node; defaults to document.body. */
  container?: ComponentProps<typeof DrawerPrimitive.Portal>["container"];
};

/**
 * Backdrop + viewport + popup in a portal. Dragging toward the edge dismisses; Escape closes; focus is trapped and returns to the trigger.
 * Nested drawers: a drawer under another one gets `data-nested-drawer-open` and `--nested-drawers`; its content hides until the front one closes.
 */
function DrawerContent({ className, children, keyboardAware = false, container, ...props }: ContentProps) {
  const side = useContext(SideContext);
  const s = SIDES[side];
  const portal = (
    <DrawerPrimitive.Portal container={container}>
      <DrawerPrimitive.Backdrop data-slot="drawer-backdrop" className={drawerStyles.backdrop} />
      <DrawerPrimitive.Viewport data-slot="drawer-viewport" className={cn(drawerStyles.viewport, s.place)}>
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cnState([drawerStyles.surface, drawerStyles.popup, s.slide, s.popup], className)}
          {...props}
        >
          {children}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
  return keyboardAware ? <DrawerPrimitive.VirtualKeyboardProvider>{portal}</DrawerPrimitive.VirtualKeyboardProvider> : portal;
}

/** Heading, linked to the popup as its accessible name. */
function DrawerTitle({ className, ...props }: ComponentProps<typeof DrawerPrimitive.Title>) {
  return <DrawerPrimitive.Title data-slot="drawer-title" className={cnState(drawerStyles.title, className)} {...props} />;
}

/** Body text, linked to the popup as its accessible description. */
function DrawerDescription({ className, ...props }: ComponentProps<typeof DrawerPrimitive.Description>) {
  return <DrawerPrimitive.Description data-slot="drawer-description" className={cnState(drawerStyles.description, className)} {...props} />;
}

/**
 * Scrollable body (Base UI Drawer.Content): text inside stays selectable with a mouse and scroll does not start a swipe.
 * Dimmed while a nested drawer is open on top.
 */
function DrawerBody({ className, ...props }: ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPrimitive.Content
      data-slot="drawer-body"
      className={cnState(
        [drawerStyles.body, "yorha-fade group-data-[nested-drawer-open]/drawer:opacity-0 group-data-[nested-drawer-swiping]/drawer:opacity-100"],
        className,
      )}
      {...props}
    />
  );
}

/** Action row; its bottom padding reserves the software keyboard inset and safe area. */
function DrawerFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="drawer-footer" className={cn(drawerStyles.footer, className)} {...props} />;
}

/** Decorative drag grip for side="bottom". */
function DrawerGrip({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="drawer-grip" aria-hidden="true" className={cn(drawerStyles.grip, className)} {...props} />;
}

/** Closes the drawer and returns focus to the trigger. Styled as the Button component. */
function DrawerClose({ className, ...props }: ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" className={cnState(buttonVariants(), className)} {...props} />;
}

export {
  Drawer,
  DrawerTrigger,
  DrawerSwipeArea,
  DrawerProvider,
  DrawerIndentBackground,
  DrawerIndent,
  DrawerVirtualKeyboardProvider,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
  DrawerGrip,
  DrawerClose,
  createDrawerHandle,
};
export type { DrawerHandle };
