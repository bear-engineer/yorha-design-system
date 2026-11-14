import type { SVGProps } from "react";
import { cn } from "../../lib/utils/utils";

/**
 * YoRHa icon set (G3). Drawing rules, enforced by icons.test.ts:
 * - sizes 12, 16, 20 only; viewBox equals the render size so the 2px stroke never scales;
 * - `fill="none" stroke="currentColor" strokeWidth=2 square caps, miter joins`, whole-pixel coordinates;
 * - solid shapes (triangle, grip dots, pupil) use `fill="currentColor"` and no stroke;
 * - decorative (`aria-hidden`), `shrink-0`, no margin. The parent box centres it with `grid place-items-center`.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox" | "children">;
export type Dir = "up" | "down" | "left" | "right";
export const ICON_SIZES = [12, 16, 20] as const;
export type IconSize = (typeof ICON_SIZES)[number];

interface BaseProps extends IconProps {
  size: IconSize;
  solid?: boolean;
  children: React.ReactNode;
}

function Svg({ size, solid, className, children, ...props }: BaseProps) {
  const paint = solid
    ? { fill: "currentColor" }
    : { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "square" as const, strokeLinejoin: "miter" as const };
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      {...paint}
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

const CHEVRON: Record<12 | 16, Record<Dir, string>> = {
  12: { down: "M2 4L6 8L10 4", up: "M2 8L6 4L10 8", left: "M8 2L4 6L8 10", right: "M4 2L8 6L4 10" },
  16: { down: "M3 6L8 11L13 6", up: "M3 10L8 5L13 10", left: "M10 3L5 8L10 13", right: "M6 3L11 8L6 13" },
};

export function ChevronIcon({ dir = "down", size = 12, ...props }: IconProps & { dir?: Dir; size?: 12 | 16 }) {
  return (
    <Svg size={size} {...props}>
      <path d={CHEVRON[size][dir]} />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg size={12} {...props}>
      <path d="M2 6L5 9L10 3" />
    </Svg>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <Svg size={12} {...props}>
      <path d="M2 2L10 10M10 2L2 10" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg size={12} {...props}>
      <path d="M6 2V10M2 6H10" />
    </Svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Svg size={12} {...props}>
      <path d="M2 6H10" />
    </Svg>
  );
}

const TRIANGLE: Record<Dir, string> = {
  right: "3 1 9 6 3 11",
  left: "9 1 3 6 9 11",
  down: "1 3 11 3 6 9",
  up: "1 9 11 9 6 3",
};

/** Solid 6x10 (10x6 for up/down) pointer in a 12 box. */
export function TriangleIcon({ dir = "right", ...props }: IconProps & { dir?: Dir }) {
  return (
    <Svg size={12} solid {...props}>
      <polygon points={TRIANGLE[dir]} />
    </Svg>
  );
}

export function SortIcon(props: IconProps) {
  return (
    <Svg size={12} {...props}>
      <path d="M3 5L6 2L9 5M3 7L6 10L9 7" />
    </Svg>
  );
}

/** 2 columns x 3 rows of 2px dots. */
export function GripIcon(props: IconProps) {
  return (
    <Svg size={12} solid {...props}>
      <path d="M3 1H5V3H3ZM7 1H9V3H7ZM3 5H5V7H3ZM7 5H9V7H7ZM3 9H5V11H3ZM7 9H9V11H7Z" />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg size={16} {...props}>
      <path d="M2 3H14V14H2ZM2 7H14M5 1V4M11 1V4" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg size={16} {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4V8H11" />
    </Svg>
  );
}

const EYE = "M1 8L4 4H12L15 8L12 12H4Z";

export function EyeIcon(props: IconProps) {
  return (
    <Svg size={16} {...props}>
      <path d={EYE} />
      <path d="M7 7H9V9H7Z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Svg size={16} {...props}>
      <path d={EYE} />
      <path d="M2 14L14 2" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg size={16} {...props}>
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11L14 14" />
    </Svg>
  );
}
