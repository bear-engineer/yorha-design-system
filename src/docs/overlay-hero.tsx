import type { ReactNode } from "react";

const UNITS: [string, string, string, string][] = [
  ["2B", "전투", "격납고 A", "정상"],
  ["9S", "정찰", "관제실", "정상"],
  ["A2", "전투", "벙커", "수리 중"],
  ["21O", "작전", "관제실", "정상"],
  ["6O", "작전", "지휘 센터", "대기"],
];

/**
 * Docs-only app frame for overlay heroes: a small unit-management screen the overlay opens over.
 * Docs render these stories in a non-inline iframe (`docs.story.inline: false`, `iframeHeight`), so the
 * viewport itself is the frame and portaled overlays land inside it.
 */
export function OverlayHero({ toolbar, children }: { toolbar?: ReactNode; children?: ReactNode }) {
  return (
    <div lang="ko" className="relative flex h-screen min-h-[360px] flex-col bg-yorha-panel text-yorha-fg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-yorha-border px-4">
        <span className="font-yorha text-yorha-sm font-semibold">유닛 관리</span>
        <span className="h-4 w-px bg-yorha-border" aria-hidden="true" />
        {toolbar}
      </header>
      <div className="flex-1 overflow-hidden p-4">
        {children}
        <table className="mt-4 w-full max-w-xl border-collapse text-yorha-sm tabular-nums">
          <thead>
            <tr className="text-left text-yorha-muted">
              <th className="border-b border-yorha-border py-1.5 font-normal">유닛</th>
              <th className="border-b border-yorha-border py-1.5 font-normal">역할</th>
              <th className="border-b border-yorha-border py-1.5 font-normal">위치</th>
              <th className="border-b border-yorha-border py-1.5 font-normal">상태</th>
            </tr>
          </thead>
          <tbody>
            {UNITS.map(([n, r, l, s]) => (
              <tr key={n}>
                <td className="border-b border-yorha-border py-1.5">{n}</td>
                <td className="border-b border-yorha-border py-1.5">{r}</td>
                <td className="border-b border-yorha-border py-1.5">{l}</td>
                <td className="border-b border-yorha-border py-1.5">{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Parameters shared by the overlay hero stories. */
export const overlayHeroParameters = {
  layout: "fullscreen",
  docs: { story: { inline: false, iframeHeight: 400 } },
} as const;
