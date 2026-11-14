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
        aria-describedby={rejected.length ? [hintId, ...rejected.map((_, i) => `${alertId}-${i}`)].join(" ") : hintId}
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
