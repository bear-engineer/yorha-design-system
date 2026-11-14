import type { ComponentProps, ReactNode } from "react";

export const drawerStyles = {};
export function Drawer({ children }: { side?: string; snapPoints?: unknown[]; defaultOpen?: boolean; children?: ReactNode }) {
  return <>{children}</>;
}
export const DrawerTrigger = (p: ComponentProps<"button">) => <button {...p} />;
export const DrawerContent = ({ children }: { keyboardAware?: boolean; children?: ReactNode }) => <div>{children}</div>;
export const DrawerTitle = (p: ComponentProps<"h2">) => <h2 {...p} />;
export const DrawerDescription = (p: ComponentProps<"p">) => <p {...p} />;
export const DrawerClose = (p: ComponentProps<"button">) => <button {...p} />;
export const DrawerBody = (p: ComponentProps<"div">) => <div {...p} />;
export const DrawerFooter = (p: ComponentProps<"div">) => <div {...p} />;
export const DrawerGrip = (p: ComponentProps<"div">) => <div {...p} />;
export const DrawerSwipeArea = (p: ComponentProps<"div">) => <div {...p} />;
export const DrawerProvider = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const DrawerIndent = (p: ComponentProps<"div">) => <div {...p} />;
export const DrawerIndentBackground = (p: ComponentProps<"div">) => <div {...p} />;
export const DrawerVirtualKeyboardProvider = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const createDrawerHandle = () => ({});
