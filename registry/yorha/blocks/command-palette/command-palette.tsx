import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { MenuList, MenuListItem } from "@/components/ui/menu-list";

export interface Command {
  id: string;
  label: string;
  /** Secondary text in the row. */
  description?: string;
  disabled?: boolean;
}

export interface CommandPaletteProps {
  commands: Command[];
  /** Called with the chosen command; the palette closes after it. */
  onRun: (command: Command) => void;
  /** Visible label of the trigger button. Default 명령 팔레트. */
  triggerLabel?: string;
  /** Open with Ctrl/Cmd + K. Default true. */
  shortcut?: boolean;
}

const norm = (s: string) => s.toLocaleLowerCase();

/**
 * Command palette block: Dialog + search Input + MenuList rows. Typing filters (substring), ArrowDown from the field moves into the
 * rows, Enter on a row runs it and closes, Esc closes and returns focus to the trigger. Copy it next to your app shell.
 */
export function CommandPalette({ commands, onRun, triggerLabel = "명령 팔레트", shortcut = true }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [value, setValue] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const statusId = useId();
  const rows = useMemo(() => commands.filter((c) => norm(`${c.label} ${c.description ?? ""}`).includes(norm(query.trim()))), [commands, query]);
  const current = rows.find((c) => c.id === value && !c.disabled) ?? rows.find((c) => !c.disabled) ?? null;

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const run = (id: string) => {
    const command = commands.find((c) => c.id === id);
    if (!command || command.disabled) return;
    setOpen(false);
    onRun(command);
  };
  const fromInput = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      listRef.current?.querySelector<HTMLElement>("[tabindex='0'], [role=option]")?.focus();
    } else if (event.key === "Enter" && current) {
      event.preventDefault();
      run(current.id);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      sound
    >
      <DialogTrigger render={<Button variant="default" />}>
        {triggerLabel}
        {shortcut ? <Kbd>Ctrl K</Kbd> : null}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{triggerLabel}</DialogTitle>
        <DialogDescription className="sr-only">검색어로 명령을 거른 뒤 Enter로 실행합니다.</DialogDescription>
        <div className="flex flex-col gap-3 p-4">
          <Input
            type="search"
            aria-label="명령 검색"
            aria-describedby={statusId}
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={fromInput}
            placeholder="명령을 입력"
          />
          <p id={statusId} role="status" className="m-0 text-yorha-xs text-yorha-fg-soft">
            {rows.length === 0 ? "일치하는 명령이 없습니다" : `${rows.length}개 명령`}
          </p>
          <div ref={listRef} className="max-h-72 overflow-y-auto">
            {rows.length > 0 ? (
              <MenuList aria-label="명령 목록" value={current?.id ?? null} onValueChange={setValue} onActivate={(id) => run(String(id))}>
                {rows.map((c) => (
                  <MenuListItem key={c.id} value={c.id} disabled={c.disabled} description={c.description}>
                    {c.label}
                  </MenuListItem>
                ))}
              </MenuList>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const COMMANDS: Command[] = [
  { id: "sync", label: "기록 동기화", description: "벙커 서버와 맞춘다" },
  { id: "scan", label: "지역 정찰", description: "새 임무를 만든다" },
  { id: "reset", label: "설정 초기화", description: "되돌릴 수 없다", disabled: true },
];

/** 데모 라우트: 명령 팔레트를 열고 실행한 명령을 보여 준다. */
export default function CommandPaletteDemo() {
  const [last, setLast] = useState<string | null>(null);
  return (
    <main aria-label="본문" lang="ko" className="flex min-h-64 flex-col items-start gap-4 bg-yorha-bg p-6 text-yorha-fg">
      <CommandPalette commands={COMMANDS} onRun={(c) => setLast(c.label)} />
      <p role="status" className="m-0 text-yorha-sm text-yorha-fg-soft">
        {last ? `실행: ${last}` : "실행한 명령이 없습니다"}
      </p>
    </main>
  );
}
