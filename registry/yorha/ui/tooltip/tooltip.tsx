// RED stub: compiles, renders the wrong thing on purpose.
import type { ReactNode } from "react";
export function Tooltip({ children }: { children?: ReactNode; [k: string]: unknown }) { return <>{children}</>; }
export function TooltipTrigger({ children }: { children?: ReactNode; [k: string]: unknown }) { return <button type="button">{children}</button>; }
export function TooltipContent(_props: { children?: ReactNode; container?: HTMLElement | null; [k: string]: unknown }) { return null; }
