import type { HTMLAttributes } from "react";

export type OrnamentVariant = "band" | "separator";

export interface OrnamentProps extends HTMLAttributes<HTMLDivElement> {
  variant?: OrnamentVariant;
}

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

// RED stub: compiles, but is not hidden from assistive tech and has no separator role.
export function Ornament({ variant: _variant, ...rest }: OrnamentProps) {
  return <div className="h-3" {...rest} />;
}

export function Separator({ orientation: _orientation, ...rest }: SeparatorProps) {
  return <div className="h-px" {...rest} />;
}
