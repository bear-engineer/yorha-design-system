import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const UNITS = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;

/** Byte count as a short localised unit string (`1.5 kB`), through Intl.NumberFormat. */
export function formatFileSize(bytes: number, locale = "ko-KR"): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const parts = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: UNITS[unit],
    unitDisplay: "narrow",
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).formatToParts(value);
  // Narrow units glue to the number (`1,000B`); a non-breaking space keeps number and unit on one line.
  return parts.map((p) => (p.type === "unit" ? `\u00a0${p.value}` : p.value)).join("");
}

function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((t) =>
    t.startsWith(".") ? name.endsWith(t) : t.endsWith("/*") ? type.startsWith(t.slice(0, -1)) : type === t,
  );
}

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/** Upload state of one file, for the optional per-file bar. `progress` is 0..1 and only read while `uploading`. */
export interface FileStatus {
  state: "uploading" | "done" | "error";
  progress?: number;
}

const SEGMENTS = 8;

/** Fixed 8-segment bar (4 x 8 px, whole pixels): the row height never depends on the state. */
function FileProgress({ status }: { status: FileStatus }) {
  const on = status.state === "done" ? SEGMENTS : status.state === "error" ? 0 : Math.round(Math.min(1, Math.max(0, status.progress ?? 0)) * SEGMENTS);
  const a11y =
    status.state === "uploading"
      ? { role: "progressbar", "aria-label": "업로드", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round((on / SEGMENTS) * 100) }
      : { role: "img", "aria-label": status.state === "done" ? "업로드 완료" : "업로드 실패" };
  return (
    <span data-slot="file-progress" data-state={status.state} {...a11y} className="inline-flex h-2 shrink-0 gap-px">
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span
          key={i}
          data-segment=""
          data-on={i < on ? "" : undefined}
          className={cn(
            "block h-2 w-1 border border-yorha-border",
            "data-[on]:border-yorha-ink data-[on]:bg-yorha-ink",
            "in-data-[state=error]:border-yorha-alert-ui",
          )}
        />
      ))}
    </span>
  );
}

export interface FileInputProps {
  label: React.ReactNode;
  multiple?: boolean;
  /** Same syntax as the native attribute; also enforced on dropped files. */
  accept?: string;
  /** Largest file in bytes; larger files are rejected. */
  maxSize?: number;
  /** Most files in the list (multiple only); the rest of a drop is rejected with a message. */
  maxFiles?: number;
  /** Upload state per file; returns undefined for "no bar". The kit only draws it, the app owns the upload. */
  status?: (file: File, index: number) => FileStatus | undefined;
  /** Shown under the button when `required` and nothing is chosen at submit. */
  requiredMessage?: string;
  clearLabel?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  onFilesChange?: (files: File[]) => void;
  locale?: string;
  selectLabel?: string;
  dropLabel?: string;
  /** Hint shown while files are dragged over the zone. */
  dropActiveLabel?: string;
  className?: string;
}

/**
 * File picker: a button (Enter/Space opens the native dialog) inside a drop zone, with a list of chosen files
 * and a remove button per file. The native input type=file stays in the form and mirrors the list through
 * DataTransfer. Rejections and changes are announced in live regions.
 */
export function FileInput({
  label,
  multiple = false,
  accept,
  maxSize,
  maxFiles,
  status,
  requiredMessage = "파일을 선택하세요",
  clearLabel = "모두 지우기",
  name,
  disabled,
  required,
  onFilesChange,
  locale = "ko-KR",
  selectLabel = "파일 선택",
  dropLabel = "파일을 여기에 끌어다 놓거나 버튼으로 선택하세요",
  dropActiveLabel = "여기에 놓으세요",
  className,
}: FileInputProps) {
  const uid = React.useId();
  const inputId = `${uid}-input`;
  const labelId = `${uid}-label`;
  const buttonId = `${uid}-button`;
  const hintId = `${uid}-hint`;
  const alertId = `${uid}-alert`;
  const nativeRef = React.useRef<HTMLInputElement>(null);
  const buttonRef = React.useRef<HTMLElement>(null);
  const removeRefs = React.useRef<(HTMLElement | null)[]>([]);
  const focusAfter = React.useRef<number | null>(null);
  const depth = React.useRef(0);
  const [files, setFiles] = React.useState<File[]>([]);
  // Events can arrive faster than renders (two drops in one frame); the ref is the list handlers read.
  const filesRef = React.useRef<File[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [rejected, setRejected] = React.useState<string[]>([]);
  const [announce, setAnnounce] = React.useState("");
  const [missing, setMissing] = React.useState(false);
  const onFilesChangeRef = React.useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;

  React.useEffect(() => {
    const target = focusAfter.current;
    if (target === null) return;
    focusAfter.current = null;
    (target < 0 ? buttonRef.current : removeRefs.current[target])?.focus();
  }, [files]);

  // V4-141: a file dropped beside the zone would navigate away; cancel file drags on the window while this input is live.
  React.useEffect(() => {
    if (disabled) return;
    const guard = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, [disabled]);

  // V4-144: the owning form's reset restores the default (empty) list; the browser already cleared the native input.
  React.useEffect(() => {
    const form = nativeRef.current?.form;
    if (!form) return;
    const onReset = () => {
      filesRef.current = [];
      setFiles([]);
      setRejected([]);
      setMissing(false);
      setAnnounce("");
      onFilesChangeRef.current?.([]);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const commit = (next: File[]) => {
    if (next.length) setMissing(false);
    filesRef.current = next;
    setFiles(next);
    onFilesChange?.(next);
    const input = nativeRef.current;
    if (input && typeof DataTransfer !== "undefined") {
      const dt = new DataTransfer();
      next.forEach((f) => dt.items.add(f));
      input.files = dt.files;
    }
  };

  const add = (incoming: File[]) => {
    if (!incoming.length) return;
    const bad: string[] = [];
    const ok = incoming.filter((f) => {
      if (!matchesAccept(f, accept)) {
        bad.push(`${f.name}: 허용되지 않는 형식입니다`);
        return false;
      }
      if (maxSize !== undefined && f.size > maxSize) {
        bad.push(`${f.name}: 크기가 ${formatFileSize(maxSize, locale)}를 넘습니다`);
        return false;
      }
      return true;
    });
    const files = filesRef.current;
    let accepted = ok;
    let next = files;
    if (multiple) {
      const fresh = ok.filter((f) => !files.some((g) => sameFile(f, g)));
      const room = maxFiles === undefined ? fresh.length : Math.max(0, maxFiles - files.length);
      fresh.slice(room).forEach((f) => bad.push(`${f.name}: 최대 ${maxFiles}개까지 선택할 수 있습니다`));
      accepted = fresh.slice(0, room);
      next = [...files, ...accepted];
    } else {
      accepted = ok.slice(-1);
      next = accepted;
    }
    // Rejections accumulate until "모두 지우기" or a form reset.
    if (bad.length) setRejected((prev) => [...prev, ...bad.filter((m) => !prev.includes(m))]);
    if (!accepted.length) {
      // keep the native list in sync with what is shown
      commit(files);
      return;
    }
    commit(next);
    setAnnounce(`${accepted.map((f) => f.name).join(", ")} 추가됨`);
  };

  const clearAll = () => {
    focusAfter.current = -1;
    setRejected([]);
    commit([]);
    setAnnounce("모두 지웠습니다");
  };

  const remove = (index: number) => {
    const gone = filesRef.current[index]!;
    const next = filesRef.current.filter((_, i) => i !== index);
    focusAfter.current = next.length ? Math.min(index, next.length - 1) : -1;
    commit(next);
    setAnnounce(`${gone.name} 제거됨`);
  };

  const dragProps = disabled
    ? {}
    : {
        onDragEnter: (e: React.DragEvent) => {
          e.preventDefault();
          depth.current += 1;
          setDragging(true);
        },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        },
        onDragLeave: () => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          depth.current = 0;
          setDragging(false);
          add(Array.from(e.dataTransfer?.files ?? []));
        },
      };

  const hints = [
    accept ? `허용 형식: ${accept}` : null,
    maxSize !== undefined ? `최대 ${formatFileSize(maxSize, locale)}` : null,
  ].filter(Boolean);

  return (
    <Field disabled={disabled} invalid={rejected.length > 0 || missing} className={className}>
      <FieldLabel id={labelId} htmlFor={inputId}>
        {label}
      </FieldLabel>
      <input
        ref={nativeRef}
        id={inputId}
        type="file"
        name={name}
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        required={required}
        // Visually hidden, not display:none: the browser can still validate it and report `invalid`. The button is the control.
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onInvalid={(e) => {
          e.preventDefault();
          setMissing(true);
          buttonRef.current?.focus();
        }}
        onChange={(e) => add(Array.from(e.currentTarget.files ?? []))}
      />
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={[hintId, ...rejected.map((_, i) => `${alertId}-${i}`), ...(missing ? [`${alertId}-missing`] : [])].join(" ")}
        data-slot="file-drop-zone"
        data-dragging={dragging ? "true" : undefined}
        data-disabled={disabled ? "" : undefined}
        aria-disabled={disabled || undefined}
        className={cn(
          "flex flex-col items-start gap-3 rounded-yorha border border-dashed border-yorha-border bg-yorha-bg p-4",
          "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha",
          // Dragging: the dashed edge turns solid ink on the panel surface; the Button keeps its own fill so it never dissolves.
          "data-[dragging=true]:cursor-copy data-[dragging=true]:border-solid data-[dragging=true]:border-yorha-ink data-[dragging=true]:bg-yorha-panel",
          // Disabled cascades from the zone: edge and text share the disabled colour with the Button.
          "data-[disabled]:cursor-not-allowed data-[disabled]:border-yorha-disabled data-[disabled]:text-yorha-disabled",
        )}
        onPaste={(e) => {
          if (disabled) return;
          const pasted = Array.from(e.clipboardData?.files ?? []);
          if (!pasted.length) return;
          e.preventDefault();
          add(pasted);
        }}
        {...dragProps}
      >
        <Button
          ref={buttonRef}
          id={buttonId}
          aria-labelledby={`${labelId} ${buttonId}`}
          disabled={disabled}
          onClick={() => nativeRef.current?.click()}
        >
          {selectLabel}
        </Button>
        {/* Both lines occupy one grid cell, so swapping them while dragging never changes the zone height. */}
        <p id={hintId} className="grid text-pretty text-yorha-sm">
          <span data-slot="file-drop-idle" aria-hidden={dragging || undefined} className={cn("col-start-1 row-start-1", dragging && "invisible")}>
            {dropLabel}
            {hints.length ? <span className="block text-yorha-fg-soft in-data-[disabled]:text-yorha-disabled">{hints.join(" · ")}</span> : null}
          </span>
          <span data-slot="file-drop-active" aria-hidden="true" className={cn("col-start-1 row-start-1 font-yorha-medium", !dragging && "invisible")}>
            {dropActiveLabel}
          </span>
        </p>
      </div>
      {files.length ? (
        <ul aria-label="선택한 파일" className="grid gap-3">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
              className="flex min-h-row items-center gap-3 border border-yorha-border px-pad-sm py-1"
            >
              <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
              <span className="shrink-0 text-yorha-sm tabular-nums text-yorha-fg-soft">{formatFileSize(file.size, locale)}</span>
              {(() => {
                const st = status?.(file, i);
                return st ? <FileProgress status={st} /> : null;
              })()}
              <Button
                ref={(node) => {
                  removeRefs.current[i] = node;
                }}
                variant="ghost"
                size="sm"
                aria-label={`${file.name} 제거`}
                disabled={disabled}
                onClick={() => remove(i)}
              >
                제거
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {files.length || rejected.length ? (
        <Button variant="ghost" size="sm" className="self-start" disabled={disabled} onClick={clearAll}>
          {clearLabel}
        </Button>
      ) : null}
      {missing ? (
        <FieldError id={`${alertId}-missing`} className="mt-0">
          {requiredMessage}
        </FieldError>
      ) : null}
      {rejected.length ? (
        <div className="grid gap-1">
          {rejected.map((m, i) => (
            <FieldError key={m} id={`${alertId}-${i}`} className="mt-0">
              {m}
            </FieldError>
          ))}
        </div>
      ) : null}
      <div role="status" className="sr-only">
        {announce}
      </div>
    </Field>
  );
}
