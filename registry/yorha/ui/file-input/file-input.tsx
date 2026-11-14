import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
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
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: UNITS[unit],
    unitDisplay: "short",
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
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

export interface FileInputProps {
  label: React.ReactNode;
  multiple?: boolean;
  /** Same syntax as the native attribute; also enforced on dropped files. */
  accept?: string;
  /** Largest file in bytes; larger files are rejected. */
  maxSize?: number;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  onFilesChange?: (files: File[]) => void;
  locale?: string;
  selectLabel?: string;
  dropLabel?: string;
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
  name,
  disabled,
  required,
  onFilesChange,
  locale = "ko-KR",
  selectLabel = "파일 선택",
  dropLabel = "파일을 여기에 끌어다 놓거나 버튼으로 선택하세요",
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
  const [dragging, setDragging] = React.useState(false);
  const [rejected, setRejected] = React.useState<string[]>([]);
  const [announce, setAnnounce] = React.useState("");

  React.useEffect(() => {
    const target = focusAfter.current;
    if (target === null) return;
    focusAfter.current = null;
    (target < 0 ? buttonRef.current : removeRefs.current[target])?.focus();
  }, [files]);

  const commit = (next: File[]) => {
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
    setRejected(bad);
    if (!ok.length) {
      // keep the native list in sync with what is shown
      commit(files);
      return;
    }
    const next = multiple ? [...files, ...ok.filter((f) => !files.some((g) => sameFile(f, g)))] : [ok[ok.length - 1]!];
    commit(next);
    setAnnounce(`${ok.map((f) => f.name).join(", ")} 추가됨`);
  };

  const remove = (index: number) => {
    const gone = files[index]!;
    const next = files.filter((_, i) => i !== index);
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
    <Field disabled={disabled} invalid={rejected.length > 0} className={className}>
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
        className="hidden"
        onChange={(e) => add(Array.from(e.currentTarget.files ?? []))}
      />
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={rejected.length ? `${hintId} ${alertId}` : hintId}
        data-slot="file-drop-zone"
        data-dragging={dragging ? "true" : undefined}
        className={cn(
          "flex flex-col items-start gap-3 rounded-yorha border border-dashed border-yorha-border bg-yorha-bg p-4",
          "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha",
          "data-[dragging=true]:border-solid data-[dragging=true]:border-yorha-ink data-[dragging=true]:bg-yorha-control data-[dragging=true]:text-yorha-on-control",
        )}
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
        <p id={hintId} className="text-yorha-sm">
          {dropLabel}
          {hints.length ? ` (${hints.join(" · ")})` : ""}
        </p>
      </div>
      {files.length ? (
        <ul aria-label="선택한 파일" className="grid gap-1">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
              className="flex items-center justify-between gap-3 border border-yorha-border px-3 py-1"
            >
              <span className="min-w-0 truncate">{file.name}</span>
              <span className="shrink-0 text-yorha-sm tabular-nums text-yorha-fg-soft">{formatFileSize(file.size, locale)}</span>
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
      {rejected.length ? (
        <div id={alertId} role="alert" className="grid gap-1 text-yorha-sm text-yorha-alert">
          {rejected.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      ) : null}
      <div role="status" className="sr-only">
        {announce}
      </div>
    </Field>
  );
}
