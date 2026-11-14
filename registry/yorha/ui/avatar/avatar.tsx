import type { ComponentProps } from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cnState } from "@/lib/utils";

export type AvatarSize = "sm" | "md" | "lg";
const SIZES: Record<AvatarSize, string> = { sm: "size-8", md: "size-12", lg: "size-16" };

/** Root: square YoRHa frame (no radius), hairline border, panel background. `size` sm 32 / md 48 / lg 64 (text follows). */
function Avatar({ size = "md", className, ...props }: ComponentProps<typeof AvatarPrimitive.Root> & { size?: AvatarSize }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cnState(
        [
          "group/avatar relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden border border-yorha-border bg-yorha-panel align-middle text-yorha-fg",
          SIZES[size],
        ],
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
        "flex size-full items-center justify-center font-yorha text-yorha-sm font-yorha-bold tracking-normal uppercase group-data-[size=sm]/avatar:text-yorha-xs group-data-[size=lg]/avatar:text-yorha-base",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
