import type { ReactNode } from "react";

// STUB (red step): compiles, renders the wrong thing.
export const Select = ({ children }: { children?: ReactNode; [k: string]: unknown }) => <div>{children}</div>;
export const SelectTrigger = ({ children }: { children?: ReactNode; [k: string]: unknown }) => <div>{children}</div>;
export const SelectValue = (_: { placeholder?: string }) => <span />;
export const SelectContent = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
export const SelectItem = ({ children }: { children?: ReactNode; value?: unknown; disabled?: boolean }) => <div>{children}</div>;
export const SelectGroup = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
export const SelectGroupLabel = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
export const SelectSeparator = () => <hr />;
