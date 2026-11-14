import type { ComponentProps } from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cnState } from "@/lib/utils";

/** Root: square YoRHa frame (no radius), hairline border, panel background. */
function Avatar({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cnState(
        "relative inline-flex size-12 shrink-0 select-none items-center justify-center overflow-hidden border border-yorha-border bg-yorha-panel align-middle text-yorha-fg",
        className,
      )}
      {...props}
    />
  );
}

/** Image layer; Base UI mounts it only after it loads, so the fallback shows through otherwise. */
function AvatarImage({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image data-slot="avatar-image" className={cnState("size-full object-cover", className)} {...props} />
  );
}

/** Initials or icon shown while the image is absent, loading or broken. */
function AvatarFallback({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cnState(
        "flex size-full items-center justify-center font-yorha text-yorha-sm font-yorha-bold tracking-yorha-heading uppercase",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
