import type { ReactNode } from "react";

/** Docs-only labelled sheet: composed variant rows at a readable scale (never a lone control in an empty canvas). */
export function Sheet({ title, children, wide = false }: { title?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div lang="ko" className={`${wide ? "w-[44rem]" : "w-[32rem]"} max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg`}>
      {title ? (
        <h3 className="mb-4 border-b border-yorha-border pb-2 font-yorha text-yorha-sm font-semibold text-yorha-fg-strong">{title}</h3>
      ) : null}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function Row({ label, children, align = "center" }: { label: string; children: ReactNode; align?: "center" | "start" }) {
  return (
    <div className={`grid grid-cols-[6.5rem_1fr] gap-4 ${align === "start" ? "items-start" : "items-center"}`}>
      <span className="font-yorha-mono text-yorha-xs text-yorha-fg-muted">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
