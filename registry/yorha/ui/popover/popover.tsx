// RED stub: compiles, renders the wrong thing on purpose.
import type { ReactNode } from "react";
export function Popover({ children }: { children?: ReactNode; [k: string]: unknown }) { return <div>{children}</div>; }
export function PopoverTrigger({ children }: { children?: ReactNode; [k: string]: unknown }) { return <button type="button">{children}</button>; }
export function PopoverContent(_props: { children?: ReactNode; container?: HTMLElement | null; [k: string]: unknown }) { return null; }
export function PopoverTitle({ children }: { children?: ReactNode }) { return <span>{children}</span>; }
export function PopoverDescription({ children }: { children?: ReactNode }) { return <span>{children}</span>; }
export function PopoverClose({ children }: { children?: ReactNode }) { return <button type="button">{children}</button>; }
