import type { ReactNode } from "react";
export function Bento({ children }: { children?: ReactNode; [k: string]: unknown }) {
  return <div>{children}</div>;
}
export function BentoTile({ children }: { children?: ReactNode; [k: string]: unknown }) {
  return <div>{children}</div>;
}
