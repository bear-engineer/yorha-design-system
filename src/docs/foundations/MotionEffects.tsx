import { useCallback, useEffect, useRef, useState } from "react";

// Live demos of every v4 motion effect, each in all three motion modes (full / reduced / off). The mode is a plain data-motion
// attribute on the column, exactly what a provider sets on <html>. One-shot effects replay by remounting the host with a static
// `data-run` (the same thing runFx does for an element that stays mounted); the button waits 1000ms between runs, the kit's flash budget.

const MODES = ["full", "reduced", "off"] as const;
const LOCKOUT_MS = 1000;
const ROWS = ["01 SCAN", "02 SYNC", "03 LINK", "04 DATA", "05 DONE"];

function useReplay() {
  const [run, setRun] = useState(0);
  const [locked, setLocked] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const replay = useCallback(() => {
    setRun((count) => count + 1);
    setLocked(true);
    timer.current = window.setTimeout(() => setLocked(false), LOCKOUT_MS);
  }, []);
  return { run, locked, replay };
}

function Replay({ label, locked, onClick }: { label: string; locked: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={locked} className="h-control-sm border border-yorha-border px-pad-sm text-yorha-xs enabled:hover:bg-yorha-hover disabled:cursor-not-allowed">
      {label}
    </button>
  );
}

function Cell({ name, children, action }: { name: string; children: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="flex min-h-24 flex-col justify-between gap-2 border-t border-yorha-separator pt-2">
      <p className="text-yorha-xs tracking-yorha-wide uppercase">{name}</p>
      <div className="flex min-h-10 items-center">{children}</div>
      <div>{action}</div>
    </div>
  );
}

function Glitch() {
  const { run, locked, replay } = useReplay();
  return (
    <Cell name="yorha-glitch" action={<Replay label="재생" locked={locked} onClick={replay} />}>
      <span key={run} className="yorha-glitch inline-block text-yorha-lg font-yorha-bold text-yorha-fg-strong whitespace-nowrap" data-text="SYSTEM FAULT" data-run="">
        SYSTEM FAULT
      </span>
    </Cell>
  );
}

function Flicker() {
  const { run, locked, replay } = useReplay();
  return (
    <Cell name="yorha-flicker" action={<Replay label="재생" locked={locked} onClick={replay} />}>
      <span key={run} className="yorha-flicker block size-6 bg-yorha-alert-ui" data-run="" aria-hidden="true" />
    </Cell>
  );
}

function Caret() {
  const { run, locked, replay } = useReplay();
  return (
    <Cell name="yorha-caret" action={<Replay label="재생" locked={locked} onClick={replay} />}>
      <p className="font-yorha-mono text-yorha-sm">
        BOOT SEQUENCE <span key={run} className="yorha-caret" data-blink="" aria-hidden="true" />
      </p>
    </Cell>
  );
}

function Stream() {
  const { run, locked, replay } = useReplay();
  return (
    <Cell name="yorha-stream" action={<Replay label="재생" locked={locked} onClick={replay} />}>
      <ul key={run} className="m-0 list-none p-0 font-yorha-mono text-yorha-xs">
        {ROWS.map((row, index) => (
          <li key={row} className="yorha-stream" style={{ "--yorha-stagger-index": index } as React.CSSProperties}>
            {row}
          </li>
        ))}
      </ul>
    </Cell>
  );
}

function Pop() {
  const [starting, setStarting] = useState(false);
  const [locked, setLocked] = useState(false);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const open = () => {
    setLocked(true);
    setStarting(true);
    // Two frames: the popup renders in its starting style, then the attribute goes away and the transition runs.
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => {
        setStarting(false);
        setLocked(false);
      });
    });
  };
  return (
    <Cell name="yorha-pop (data-side=bottom)" action={<Replay label="열기" locked={locked} onClick={open} />}>
      <div className="yorha-pop yorha-surface w-40 px-pad-sm py-2 text-yorha-xs" data-side="bottom" data-starting-style={starting ? "" : undefined}>
        팝업이 앵커 가장자리에서 부드럽게 열립니다.
      </div>
    </Cell>
  );
}

function Unfold() {
  const [open, setOpen] = useState(true);
  return (
    <Cell name="yorha-unfold" action={<Replay label={open ? "닫기" : "열기"} locked={false} onClick={() => setOpen((value) => !value)} />}>
      <div className="yorha-unfold min-h-14 w-48 border border-yorha-border bg-yorha-panel px-pad-sm py-2 text-yorha-xs" data-open={open ? "" : undefined} data-closed={open ? undefined : ""}>
        다이얼로그: 가운데 선에서 펼쳐지고 선으로 접힙니다.
      </div>
    </Cell>
  );
}

function Wipe() {
  return (
    <Cell name="yorha-wipe (hover, focus)" action={null}>
      <button
        type="button"
        className="yorha-wipe h-control-md border border-yorha-ink bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-[length:0%_100%] bg-left bg-no-repeat px-pad-md text-yorha-sm hover:bg-[length:100%_100%] hover:text-yorha-on-ink focus-visible:bg-[length:100%_100%] focus-visible:text-yorha-on-ink"
      >
        SELECT
      </button>
    </Cell>
  );
}

function Pixel() {
  const swatch = "block h-6 w-16";
  return (
    <Cell name="yorha-dither-12/25/50/75, yorha-dots, yorha-rail" action={null}>
      <div className="flex flex-wrap items-center gap-2 text-yorha-ink" aria-hidden="true">
        <span className={`${swatch} yorha-dither-12`} />
        <span className={`${swatch} yorha-dither-25`} />
        <span className={`${swatch} yorha-dither-50`} />
        <span className={`${swatch} yorha-dither-75`} />
        <span className={`${swatch} yorha-dots`} />
        <span className="yorha-rail block h-6" />
      </div>
    </Cell>
  );
}

export function MotionEffects() {
  return (
    <div className="grid gap-4 font-yorha text-yorha-fg md:grid-cols-3 [&>*]:min-w-0" data-testid="motion-effects">
      {MODES.map((mode) => (
        <section key={mode} aria-label={`모션 ${mode}`} data-motion={mode} className="flex flex-col gap-3 border border-yorha-border bg-yorha-panel p-4">
          <h3 className="text-yorha-sm tracking-yorha-wide uppercase">data-motion={mode}</h3>
          <Glitch />
          <Flicker />
          <Caret />
          <Stream />
          <Pop />
          <Unfold />
          <Wipe />
          <Pixel />
        </section>
      ))}
    </div>
  );
}
