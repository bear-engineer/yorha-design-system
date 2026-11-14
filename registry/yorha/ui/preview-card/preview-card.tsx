import type { ComponentProps, ReactNode } from "react";

export const PreviewCard = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const PreviewCardTrigger = (p: ComponentProps<"a"> & { delay?: number; closeDelay?: number }) => <a {...p} />;
export const PreviewCardContent = ({ children }: { arrow?: boolean; children?: ReactNode }) => <div>{children}</div>;
export const PreviewCardTitle = (p: ComponentProps<"p">) => <p {...p} />;
export const PreviewCardDescription = (p: ComponentProps<"p">) => <p {...p} />;
export const createPreviewCardHandle = () => ({});
export const previewCardStyles = {} as Record<string, string>;
