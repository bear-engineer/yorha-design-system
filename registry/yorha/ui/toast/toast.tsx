import { useEffect, useRef, type ComponentProps } from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { Button } from "@/components/ui/button";
import { Glyph } from "@/components/ui/glyph";
import { CrossIcon } from "@/components/ui/icons";
import { runFx } from "@/lib/fx";
import { cn, cnState } from "@/lib/utils";

export type ToastType = "info" | "success" | "alert";

/** Add, update and close toasts: `const toast = useToast(); toast.add({ title, type: "success" })`. */
const useToast = ToastPrimitive.useToastManager;
/** Manager usable outside React; pass it to ToastProvider's `toastManager`. */
const createToastManager = ToastPrimitive.createToastManager;

const TYPE_LABEL: Record<ToastType, string> = { info: "정보", success: "성공", alert: "경고" };

// Shape cue per type so the variant never relies on colour alone: info = diamond, success = square, alert = triangle with
// a mark (the only red-orange). Every shape is a 12px dot glyph centred in one fixed 20px box, so the title starts at the
// same x for all three types. The alert mark flickers once when its toast mounts as the front toast, and at most once per
// second for the whole kit (WCAG 2.3.1): five alerts inside a second flicker one mark.
const GLYPH: Record<ToastType, "diamond" | "square" | "alert"> = { info: "diamond", success: "square", alert: "alert" };
let lastAlertFlicker = Number.NEGATIVE_INFINITY;

function TypeShape({ type, front }: { type: ToastType; front: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (type !== "alert" || !front) return;
    const now = performance.now();
    if (now - lastAlertFlicker < 1000) return;
    lastAlertFlicker = now;
    runFx(ref.current);
  }, [type, front]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn("mt-0.5 grid size-icon-lg shrink-0 place-items-center", type === "alert" && "yorha-flicker text-yorha-alert-ui")}
    >
      <Glyph name={GLYPH[type]} />
    </span>
  );
}

function toToastType(type: string | undefined): ToastType {
  return type === "success" || type === "alert" ? type : "info";
}

// Stack. Every toast sits at bottom-0. Collapsed (rest): the toasts behind the front one peek 8px per index above it,
// and are clipped to the front toast's height (`--toast-frontmost-height`); their content is hidden (`data-behind`).
// No scale: a fractional scale blurs the peeking edge and takes the hidden close buttons under the 24px target size. Expanded (`data-expanded`: pointer over the stack or focus inside): each toast
// takes its own height and rises by Base UI's `--toast-offset-y` (heights of the toasts in front) plus an 8px gap per index.
// Only transform/opacity transition (the height change at expand is instant and the content fades in), so removing a
// toast moves the others with a transform transition instead of a layout jump. While dragging, Base UI writes an inline
// `transform` that freezes the drag; on release the class transform (same value, from --toast-swipe-movement-*) takes
// over and `translate` carries the toast on outward in the swipe direction. Every movement is scaled by
// --motion-spatial, so reduced motion is opacity only and off is instant.
const ROOT =
  "group/toast absolute right-0 bottom-0 z-[calc(100-var(--toast-index))] w-full touch-pan-y border bg-yorha-panel p-3 pr-2 rounded-yorha shadow-yorha-md " +
  "font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg " +
  "h-[var(--toast-frontmost-height,auto)] " +
  "[transform:translate(var(--toast-swipe-movement-x),calc(var(--toast-swipe-movement-y)-var(--toast-index)*8px))] " +
  "data-[expanded]:h-[var(--toast-height,auto)] " +
  "data-[expanded]:[transform:translate(var(--toast-swipe-movement-x),calc(var(--toast-swipe-movement-y)-(var(--toast-offset-y)+var(--toast-index)*8px)))] " +
  // The pointer-safe strip below keeps the viewport hovered (timers paused) while the cursor crosses the gap.
  "after:absolute after:top-full after:left-0 after:h-2 after:w-full after:content-[''] " +
  "[transition-property:opacity,transform,translate] " +
  "[transition-duration:max(var(--motion-select),var(--motion-reduced-fade)),calc(var(--motion-select)*var(--motion-spatial)),calc(var(--motion-select)*var(--motion-spatial))] " +
  "[transition-timing-function:var(--yorha-ease-out)] " +
  "data-[starting-style]:opacity-0 data-[starting-style]:[translate:calc(var(--toast-exit-x,1rem)*var(--motion-spatial))_calc(var(--toast-exit-y,0px)*var(--motion-spatial))]" +
  " " +
  "data-[ending-style]:opacity-0 data-[ending-style]:[translate:calc(var(--toast-exit-x,1rem)*var(--motion-spatial))_calc(var(--toast-exit-y,0px)*var(--motion-spatial))]" +
  " " +
  "data-[ending-style]:[transition-duration:max(var(--motion-select-exit),var(--motion-reduced-fade)),calc(var(--motion-select-exit)*var(--motion-spatial)),calc(var(--motion-select-exit)*var(--motion-spatial))] " +
  "data-[ending-style]:[transition-timing-function:var(--yorha-ease-in)] " +
  // A swipe release keeps going the way it was thrown, decelerating from the release point.
  "data-[swipe-direction]:data-[ending-style]:[transition-timing-function:var(--yorha-ease-out)] " +
  "data-[swipe-direction=right]:[--toast-exit-x:calc(100%+1rem)] data-[swipe-direction=left]:[--toast-exit-x:calc(-100%-1rem)] " +
  "data-[swipe-direction=down]:[--toast-exit-x:0px] data-[swipe-direction=down]:[--toast-exit-y:calc(100%+1rem)] " +
  "data-[swipe-direction=up]:[--toast-exit-x:0px] data-[swipe-direction=up]:[--toast-exit-y:calc(-100%-1rem)] " +
  "data-[swiping]:[transition-duration:0s]";

// Anchored toasts (added with `positionerProps`) pop from their anchor instead of sliding in.
const ANCHORED_ROOT =
  "relative w-max max-w-80 border bg-yorha-panel px-3 py-2 rounded-yorha shadow-yorha-md " +
  "font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg yorha-pop";

// Pixel arrow: one 12px triangle glyph per side, shown by the Base UI arrow's `data-side` (no rotation).
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
const ARROW_POS =
  "group/arrow block size-3 data-[side=bottom]:top-[-8px] data-[side=top]:bottom-[-8px] data-[side=left]:right-[-8px] data-[side=right]:left-[-8px]";
const ARROW = ARROW_POS + " text-yorha-border";

/** Pointer from an anchored toast to its anchor. Rendered by ToastList inside anchored toasts. */
function ToastArrow({ className, ...props }: ComponentProps<typeof ToastPrimitive.Arrow>) {
  return <ToastPrimitive.Arrow data-slot="toast-arrow" className={cnState(ARROW, className)} {...props}>
      <ArrowGlyphs />
    </ToastPrimitive.Arrow>;
}

/** Action button of a toast (`toast.add({ actionProps: { children: "Undo", onClick } })`). Renders only when set. */
function ToastAction({ className, ...props }: ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cnState(
        "mt-2 min-h-6 cursor-pointer rounded-yorha border border-yorha-border px-2 font-yorha text-yorha-xs tracking-yorha-body text-yorha-fg hover:bg-yorha-ink hover:text-yorha-on-ink focus-visible:yorha-focus",
        className,
      )}
      {...props}
    />
  );
}

/** Anchors one toast to an element (`toast.add({ positionerProps: { anchor, sideOffset } })`). Used by ToastList. */
function ToastPositioner({ className, ...props }: ComponentProps<typeof ToastPrimitive.Positioner>) {
  return (
    <ToastPrimitive.Positioner
      data-slot="toast-positioner"
      className={cnState("z-[calc(var(--yorha-z-toast)-var(--toast-index))] outline-none", className)}
      {...props}
    />
  );
}

// One 1px border for every type, so the content x never depends on the type. The alert's thick left edge is an inset
// shadow (4px, inside the 12px padding) next to the usual offset shadow.
const TYPE_BORDER: Record<ToastType, string> = {
  info: "border-yorha-border",
  success: "border-yorha-ink",
  alert: "border-yorha-alert-ui shadow-[inset_4px_0_0_var(--yorha-alert-ui),4px_4px_0_0_var(--yorha-shadow)]",
};

/**
 * Renders every queued toast. Included by ToastProvider; mount it yourself only with `viewport={false}`.
 *
 * Migration (v4): rear toasts are transparent and `visibility: hidden` (not tab stops) only while the stack is collapsed; expanded they show their content. The type mark is a dot glyph (`diamond`/`square`/`alert`, no clip-path or rotation); the alert mark flickers once at mount (front toast, one per second kit-wide). Root is `touch-action: pan-y` so a horizontal swipe is not scrolled away. Arrows are pixel triangles.
 * Migration (v3): type shape sits in a fixed 20px box (titles align across types), the alert edge is an inset shadow (all types have a 1px border), close is a 24px ghost icon Button on the title row, and the stack is collapsed by default (rear toasts peek 8px, expand on hover/focus). Anything that read toast x-offsets or the `×` text must be updated.
 */
function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();
  return toasts.map((toast, index) => {
    const type = toToastType(toast.type);
    const anchored = toast.positionerProps !== undefined;
    const root = (
      <ToastPrimitive.Root
        key={anchored ? undefined : toast.id}
        toast={toast}
        data-slot="toast"
        data-type={type}
        className={cnState([anchored ? ANCHORED_ROOT : ROOT, TYPE_BORDER[type]], undefined)}
      >
        {anchored ? <ToastArrow /> : null}
        <ToastPrimitive.Content
          className={cn(
            "flex h-full items-start gap-2 overflow-hidden [transition-property:opacity,visibility] duration-(--motion-select) data-[behind]:[[data-slot=toast]:not([data-expanded])_&]:invisible data-[behind]:[[data-slot=toast]:not([data-expanded])_&]:opacity-0",
            anchored && "overflow-visible",
          )}
        >
          <TypeShape type={type} front={index === 0} />
          <div className="min-w-0 flex-1">
            <span className="sr-only">{TYPE_LABEL[type]}: </span>
            <ToastPrimitive.Title
              data-slot="toast-title"
              className="flex min-h-6 items-center font-yorha-bold text-yorha-sm tracking-yorha-heading uppercase"
            />
            <ToastPrimitive.Description className="mt-1 text-yorha-fg-soft" />
            {toast.actionProps ? <ToastAction /> : null}
          </div>
          <ToastPrimitive.Close
            // Base UI sets aria-hidden on Close while the stack is collapsed, but the button stays tabbable
            // and visible, which axe flags (aria-hidden-focus). Keep it exposed.
            aria-hidden={false}
            render={<Button variant="ghost" size="sm" square aria-label="닫기" className="size-6 shrink-0 focus-visible:outline-offset-[calc(var(--yorha-ring-width)*-1)]" />}
          >
            <CrossIcon />
          </ToastPrimitive.Close>
        </ToastPrimitive.Content>
      </ToastPrimitive.Root>
    );
    return anchored ? (
      <ToastPositioner key={toast.id} toast={toast}>
        {root}
      </ToastPositioner>
    ) : (
      root
    );
  });
}

type ProviderProps = ComponentProps<typeof ToastPrimitive.Provider> & {
  /** Set false to place <ToastViewport /> yourself. */
  viewport?: boolean;
};

/**
 * Provider plus viewport. The viewport is a labelled `region` with aria-live polite;
 * timers pause while the pointer is over it or focus is inside it.
 */
function ToastProvider({ children, viewport = true, timeout = 5000, ...props }: ProviderProps) {
  return (
    <ToastPrimitive.Provider timeout={timeout} {...props}>
      {children}
      {viewport ? <ToastViewport /> : null}
    </ToastPrimitive.Provider>
  );
}

type ViewportProps = ComponentProps<typeof ToastPrimitive.Viewport> & {
  /** Portal mount node; defaults to document.body. */
  container?: ComponentProps<typeof ToastPrimitive.Portal>["container"];
  /** Position inside the container instead of the window (previews, embedded panels). */
  contained?: boolean;
};

/** Fixed bottom-right stack in a portal. */
function ToastViewport({ className, container, contained = false, ...props }: ViewportProps) {
  return (
    <ToastPrimitive.Portal container={container}>
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        aria-label="알림"
        className={cnState(
          cn(contained ? "absolute right-4 bottom-4" : "fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))]", "z-(--yorha-z-toast) w-80 max-w-[calc(100%-2rem)] outline-none focus-visible:yorha-focus"),
          className,
        )}
        {...props}
      >
        <ToastList />
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

export { ToastProvider, ToastViewport, ToastAction, ToastArrow, ToastPositioner, useToast, createToastManager };
