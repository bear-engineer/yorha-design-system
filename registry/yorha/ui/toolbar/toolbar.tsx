import type { ComponentProps } from "react";
import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn, cnState } from "@/lib/utils";

/**
 * Root. One tab stop: Tab enters at the last focused item, Arrow keys move between items
 * (Left/Right when horizontal, Up/Down when vertical), Home/End jump to the ends.
 */
function Toolbar({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.Root>) {
  return (
    <ToolbarPrimitive.Root
      data-slot="toolbar"
      className={cnState(
        [
          "inline-flex max-w-full flex-wrap items-center gap-1 border border-yorha-border bg-yorha-panel p-1 text-yorha-fg",
          "font-yorha text-yorha-sm tracking-yorha-body rounded-yorha",
          "data-[orientation=vertical]:flex-col data-[orientation=vertical]:flex-nowrap data-[orientation=vertical]:items-stretch",
        ],
        className,
      )}
      {...props}
    />
  );
}

/** Action button that joins the roving focus. Use `render` to wrap a menu or dialog trigger. */
function ToolbarButton({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.Button>) {
  return (
    <ToolbarPrimitive.Button
      data-slot="toolbar-button"
      className={cnState(buttonVariants({ variant: "ghost", size: "sm" }), className)}
      {...props}
    />
  );
}

/** Toggle (aria-pressed) that joins the roving focus; pressed state fills with ink and is not colour-only. */
function ToolbarToggle({ className, ...props }: ComponentProps<typeof TogglePrimitive>) {
  return (
    <ToolbarPrimitive.Button
      data-slot="toolbar-toggle"
      render={<TogglePrimitive />}
      className={cnState(
        [
          buttonVariants({ variant: "ghost", size: "sm" }),
          "data-[pressed]:bg-[length:100%_100%] data-[pressed]:text-yorha-on-ink",
        ],
        className as ComponentProps<typeof ToolbarPrimitive.Button>["className"],
      )}
      {...(props as ComponentProps<typeof ToolbarPrimitive.Button>)}
    />
  );
}

/** Link that joins the roving focus. Pass `render={<NavLink to="..." />}` for client-side routing. */
function ToolbarLink({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.Link>) {
  return (
    <ToolbarPrimitive.Link
      data-slot="toolbar-link"
      className={cnState(
        "inline-flex h-control-sm items-center px-pad-sm whitespace-nowrap text-yorha-sm text-yorha-fg underline underline-offset-4 hover:bg-yorha-ink hover:text-yorha-on-ink focus-visible:yorha-focus",
        className,
      )}
      {...props}
    />
  );
}

/** Rule between groups. It flips with the toolbar orientation. */
function ToolbarSeparator({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.Separator>) {
  return (
    <ToolbarPrimitive.Separator
      data-slot="toolbar-separator"
      className={cnState(
        "bg-yorha-separator data-[orientation=vertical]:mx-1 data-[orientation=vertical]:h-6 data-[orientation=vertical]:w-px data-[orientation=horizontal]:my-1 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
        className,
      )}
      {...props}
    />
  );
}

/** Groups related controls under one accessible name (`aria-label`). Disabling the group disables its items. */
function ToolbarGroup({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.Group>) {
  return (
    <ToolbarPrimitive.Group
      data-slot="toolbar-group"
      className={cnState("flex items-center gap-1 data-[orientation=vertical]:flex-col", className)}
      {...props}
    />
  );
}

/** Text input. Left/Right also move the caret, so put at most one, last. */
function ToolbarInput({ className, ...props }: ComponentProps<typeof ToolbarPrimitive.Input>) {
  return (
    <ToolbarPrimitive.Input
      data-slot="toolbar-input"
      className={cnState(
        cn(
          "h-control-sm min-w-0 flex-1 basis-32 in-data-[orientation=vertical]:flex-none in-data-[orientation=vertical]:basis-auto rounded-yorha border border-yorha-border bg-yorha-panel px-2 text-yorha-sm text-yorha-fg",
          "placeholder:text-yorha-fg-soft focus-visible:yorha-focus yorha-disabled",
        ),
        className,
      )}
      {...props}
    />
  );
}

export { Toolbar, ToolbarButton, ToolbarToggle, ToolbarLink, ToolbarSeparator, ToolbarGroup, ToolbarInput };
