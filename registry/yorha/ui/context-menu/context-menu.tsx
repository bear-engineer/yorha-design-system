import type { ComponentProps, ReactNode } from "react";

type D = ComponentProps<"div">;
export const ContextMenu = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const ContextMenuTrigger = (p: D) => <div {...p} />;
export const ContextMenuContent = ({ children }: { arrow?: boolean; children?: ReactNode }) => <div>{children}</div>;
export const ContextMenuItem = (p: D) => <div {...p} />;
export const ContextMenuLinkItem = (p: ComponentProps<"a">) => <a {...p} />;
export const ContextMenuSeparator = (p: D) => <div {...p} />;
export const ContextMenuSub = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const ContextMenuSubTrigger = (p: D) => <div {...p} />;
export const ContextMenuCheckboxItem = (p: D & { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => <div {...p} />;
export const ContextMenuRadioGroup = (p: D & { value?: string; onValueChange?: (v: string) => void }) => <div {...p} />;
export const ContextMenuRadioItem = (p: D & { value?: string }) => <div {...p} />;
export const ContextMenuGroup = (p: D) => <div {...p} />;
export const ContextMenuLabel = (p: D) => <div {...p} />;
export const ContextMenuShortcut = (p: ComponentProps<"span">) => <span {...p} />;
export const contextMenuStyles = {} as Record<string, string>;
