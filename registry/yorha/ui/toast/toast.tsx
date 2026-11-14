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
  "transition-[opacity,translate] duration-(--motion-panel) ease-yorha-out " +
  "data-[starting-style]:translate-x-4 data-[starting-style]:opacity-0 " +
  "data-[ending-style]:translate-x-4 data-[ending-style]:opacity-0 data-[ending-style]:duration-(--motion-select) data-[ending-style]:ease-yorha-in";

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
    return (
      <ToastPrimitive.Root key={toast.id} toast={toast} data-slot="toast" data-type={type} className={cnState([ROOT, TYPE_BORDER[type]], undefined)}>
        <TypeShape type={type} />
        <ToastPrimitive.Content className="min-w-0 flex-1">
          <span className="sr-only">{TYPE_LABEL[type]}: </span>
          <ToastPrimitive.Title className="font-yorha-bold text-yorha-sm tracking-yorha-heading uppercase" />
          <ToastPrimitive.Description className="mt-1 text-yorha-fg-soft" />
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
          cn(contained ? "absolute" : "fixed", "right-4 bottom-4 z-(--yorha-z-toast) flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none focus-visible:yorha-focus"),
          className,
        )}
        {...props}
      >
        <ToastList />
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

export { ToastProvider, ToastViewport, useToast, createToastManager };
