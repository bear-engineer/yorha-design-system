import { Children, cloneElement, isValidElement, type ComponentProps, type ReactElement } from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { Glyph, type GlyphName } from "@/components/ui/glyph";
import { cn, cnState } from "@/lib/utils";

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

export type AvatarStatusValue = "online" | "away" | "busy" | "offline";

// Shape carries the state, colour only reinforces it: disc / diamond / square / ring.
const STATUS: Record<AvatarStatusValue, { glyph: GlyphName; label: string; colour: string }> = {
  online: { glyph: "disc", label: "온라인", colour: "text-yorha-fg-strong" },
  away: { glyph: "diamond", label: "자리 비움", colour: "text-yorha-fg-soft" },
  busy: { glyph: "square", label: "다른 용무 중", colour: "text-yorha-alert-ui" },
  offline: { glyph: "ring", label: "오프라인", colour: "text-yorha-fg-soft" },
};

/** Presence mark in the avatar's bottom-right corner (inside the frame, which clips). Named for screen readers; `label` overrides the Korean default. */
function AvatarStatus({ status, label, className }: { status: AvatarStatusValue; label?: string; className?: string }) {
  const s = STATUS[status];
  return (
    <span
      data-slot="avatar-status"
      data-status={status}
      role="img"
      aria-label={label ?? s.label}
      className={cn("absolute right-0 bottom-0 grid size-3 place-items-center bg-yorha-panel", s.colour, className)}
    >
      <Glyph name={s.glyph} box={12} />
    </span>
  );
}

/** Overlapping row of avatars (hairline overlap); more than `max` collapse into a "+N" avatar. `size` is applied to every child. */
function AvatarGroup({
  max = 4,
  size = "md",
  label,
  className,
  children,
}: {
  max?: number;
  size?: AvatarSize;
  /** Accessible name of the group, e.g. "Team". */
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const all = Children.toArray(children).filter(isValidElement) as ReactElement<ComponentProps<typeof Avatar>>[];
  const shown = all.slice(0, max);
  const rest = all.length - shown.length;
  const item = "-ml-px first:ml-0";
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center", className)}>
      {shown.map((child) => cloneElement(child, { size, className: cn(item, child.props.className as string | undefined) }))}
      {rest > 0 ? (
        <Avatar size={size} role="img" aria-label={`외 ${rest}명`} className={item}>
          <AvatarFallback>+{rest}</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

export { Avatar, AvatarFallback, AvatarGroup, AvatarImage, AvatarStatus };
