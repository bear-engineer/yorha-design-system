export type ClassValue = string | number | false | null | undefined | ClassValue[];

/** Join class names. Falsy values are dropped; nested arrays are flattened. */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue): void => {
    if (!v && v !== 0) return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    out.push(String(v));
  };
  inputs.forEach(walk);
  return out.join(" ");
}

/**
 * Compose a Base UI className prop (string or state => string) with kit classes.
 * Base UI components accept `className` as a function of their state.
 */
export function cnState<S>(
  base: ClassValue,
  className: string | ((state: S) => string | undefined) | undefined,
): string | ((state: S) => string) {
  if (typeof className === "function") return (state: S) => cn(base, className(state));
  return cn(base, className);
}
