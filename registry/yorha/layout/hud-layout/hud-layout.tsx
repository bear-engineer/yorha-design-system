import type { ReactNode } from "react";

export type HudCorner = "top-start" | "top-end" | "bottom-start" | "bottom-end";
export interface HudLayoutProps {
  label?: string;
  hidden?: boolean;
  position?: "fixed" | "absolute";
  className?: string;
  children?: ReactNode;
}
export interface HudRegionProps {
  corner: HudCorner;
  label: string;
  className?: string;
  children?: ReactNode;
}

// STUB (red step).
export function HudLayout({ children }: HudLayoutProps) {
  return <div>{children}</div>;
}
export function HudRegion({ children }: HudRegionProps) {
  return <div>{children}</div>;
}
