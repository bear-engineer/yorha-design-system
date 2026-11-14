import type { ComponentProps } from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { Button } from "@/components/ui/button";
import { cn, cnState } from "@/lib/utils";

export type ToastType = "info" | "success" | "alert";

/** Add, update and close toasts: `const toast = useToast(); toast.add({ title, type: "success" })`. */
const useToast = ToastPrimitive.useToastManager;
/** Manager usable outside React; pass it to ToastProvider's `toastManager`. */
const createToastManager = ToastPrimitive.createToastManager;

const TYPE_LABEL: Record<ToastType, string> = { info: "정보", success: "성공", alert: "경고" };

// Shape cue per type so the variant never relies on colour alone:
// info = diamond, success = square with inner square, alert = triangle (the only red-orange).
function TypeShape({ type }: { type: ToastType }) {
  if (type === "alert") {
    return <span aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 bg-yorha-alert-ui [clip-path:polygon(50%_0,100%_100%,0_100%)]" />;
  }
  if (type === "success") {
    return <span aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 border-2 border-current bg-current bg-clip-content p-0.5" />;
  }
  return <span aria-hidden="true" className="mt-1 size-2.5 shrink-0 rotate-45 bg-current" />;
}

function toToastType(type: string | undefined): ToastType {
  return type === "success" || type === "alert" ? type : "info";
}

const ROOT =
  "relative flex w-80 max-w-full items-start gap-3 border bg-yorha-panel p-3 pr-2 rounded-yorha shadow-yorha-md " +
  "font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg " +
  "yorha-slide-left [--yorha-slide-distance:1rem]";

// Anchored toasts (added with `positionerProps`) pop from their anchor instead of sliding in.
const ANCHORED_ROOT =
  "relative flex w-max max-w-80 items-start gap-3 border bg-yorha-panel px-3 py-2 rounded-yorha shadow-yorha-md " +
  "font-yorha text-yorha-sm tracking-yorha-body text-yorha-fg yorha-pop";

const ARROW =
  "relative block h-1.5 w-3 overflow-clip " +
  "data-[side=bottom]:top-[-6px] data-[side=top]:bottom-[-6px] data-[side=top]:rotate-180 " +
  "data-[side=left]:right-[-9px] data-[side=left]:rotate-90 data-[side=right]:left-[-9px] data-[side=right]:-rotate-90 " +
  "before:absolute before:bottom-0 before:left-1/2 before:size-[calc(6px*1.4142)] before:border before:border-yorha-border " +
  "before:bg-yorha-panel before:content-[''] before:[transform:translate(-50%,50%)_rotate(45deg)]";

/** Pointer from an anchored toast to its anchor. Rendered by ToastList inside anchored toasts. */
function ToastArrow({ className, ...props }: ComponentProps<typeof ToastPrimitive.Arrow>) {
  return <ToastPrimitive.Arrow data-slot="toast-arrow" className={cnState(ARROW, className)} {...props} />;
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

const TYPE_BORDER: Record<ToastType, string> = {
  info: "border-yorha-border",
  success: "border-yorha-ink",
  alert: "border-yorha-alert-ui border-l-4",
};

/** Renders every queued toast. Included by ToastProvider; mount it yourself only with `viewport={false}`. */
function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();
  return toasts.map((toast) => {
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
        <TypeShape type={type} />
        <ToastPrimitive.Content className="min-w-0 flex-1">
          <span className="sr-only">{TYPE_LABEL[type]}: </span>
          <ToastPrimitive.Title className="font-yorha-bold text-yorha-sm tracking-yorha-heading uppercase" />
          <ToastPrimitive.Description className="mt-1 text-yorha-fg-soft" />
          {toast.actionProps ? <ToastAction /> : null}
        </ToastPrimitive.Content>
        <ToastPrimitive.Close
          // Base UI sets aria-hidden on Close while the stack is collapsed, but the button stays tabbable
          // and visible, which axe flags (aria-hidden-focus). Keep it exposed.
          aria-hidden={false}
          render={<Button variant="ghost" size="sm" square aria-label="닫기" />}
        >
          <span aria-hidden="true">×</span>
        </ToastPrimitive.Close>
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
          cn(contained ? "absolute right-4 bottom-4" : "fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))]", "z-(--yorha-z-toast) flex w-80 max-w-[calc(100%-2rem)] flex-col gap-2 outline-none focus-visible:yorha-focus"),
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
