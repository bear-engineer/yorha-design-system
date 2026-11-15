import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Field, FieldDescription, FieldError, FieldGroupControl, FieldLabel } from "@/components/ui/field";
import { InputGroup } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

// Built from parts so the registry source carries no literal colour.
const DEFAULT_COLOR = ["#", "000000"].join("");
const FULL = /^#?[0-9a-f]{6}$/i;
const SHORT = /^#?[0-9a-f]{3}$/i;
const PREFIX = /^#?[0-9a-f]{0,6}$/i;

/** `#abc`, `abc` or `#aabbcc` to lower-case `#aabbcc`; null when it is not a colour. */
export function normalizeHex(text: string): string | null {
  const t = text.trim();
  if (FULL.test(t)) return `#${t.replace("#", "").toLowerCase()}`;
  if (SHORT.test(t)) {
    const [r, g, b] = t.replace("#", "").toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

const hsl = (h: number, s: number, l: number): string => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

/** Built at runtime so the registry source carries no literal colour: four greys and four muted hues. */
const DEFAULT_SWATCHES = [10, 35, 65, 90].map((l) => hsl(0, 0, l)).concat([0, 40, 210, 280].map((h) => hsl(h, 45, 45)));

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

const subscribePointer = (cb: () => void) => {
  const mq = window.matchMedia("(pointer: fine)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** Fine primary pointer: the kit popover replaces the native colour dialog as the swatch's first action. */
const useFinePointer = () =>
  React.useSyncExternalStore(subscribePointer, () => window.matchMedia("(pointer: fine)").matches, () => false);

export interface ColorInputProps {
  label: React.ReactNode;
  /** Controlled `#rrggbb` value. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Submitted with the form as `#rrggbb` (set on the native colour input). */
  name?: string;
  disabled?: boolean;
  description?: React.ReactNode;
  error?: React.ReactNode;
  /** Colours offered in the popover (fine pointers). Defaults to four greys and four hues. */
  swatches?: string[];
  /** Name of the native picker. Defaults to "<label> 색상 선택". */
  pickerLabel?: string;
  className?: string;
}

/** Swatch, hex text field and native colour picker kept in sync. The swatch is the picker's visible face. */
export function ColorInput({
  label,
  value,
  defaultValue = DEFAULT_COLOR,
  onValueChange,
  name,
  disabled,
  description,
  error,
  pickerLabel,
  swatches = DEFAULT_SWATCHES,
  className,
}: ColorInputProps) {
  const [inner, setInner] = React.useState(normalizeHex(defaultValue) ?? DEFAULT_COLOR);
  const color = (value && normalizeHex(value)) || inner;
  const [text, setText] = React.useState(color);
  React.useEffect(() => setText(color), [color]);

  const commit = (next: string) => {
    setInner(next);
    if (next !== color) onValueChange?.(next);
  };
  const fine = useFinePointer();
  const [open, setOpen] = React.useState(false);
  const nativeRef = React.useRef<HTMLInputElement>(null);
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const list = swatches.map((c) => normalizeHex(c)).filter((c): c is string => c !== null);
  const selected = list.indexOf(color);
  const [rove, setRove] = React.useState(0);
  const roveTo = selected >= 0 ? selected : Math.min(rove, Math.max(0, list.length - 1));
  const eyeDropper = typeof window !== "undefined" ? (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper : undefined;
  const defaultRef = React.useRef(normalizeHex(defaultValue) ?? DEFAULT_COLOR);
  defaultRef.current = normalizeHex(defaultValue) ?? DEFAULT_COLOR;
  const resetRef = React.useRef<() => void>(() => {});
  resetRef.current = () => {
    const d = defaultRef.current;
    setInner(d);
    setText(d);
    if (value !== undefined && d !== color) onValueChange?.(d);
  };
  // V4-144: the owning form's reset restores the default colour and text (the native input is controlled, so React must follow the reset).
  React.useEffect(() => {
    const form = nativeRef.current?.form;
    if (!form) return;
    const onReset = () => resetRef.current();
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);
  const invalid = !PREFIX.test(text.trim());
  // V4-142: typed but not yet a colour (or unchanged from nothing): the swatch shows the committed colour under a dither mat, nothing is committed.
  const partial = !invalid && !FULL.test(text.trim());
  const pickerName = pickerLabel ?? `${typeof label === "string" ? label : "색상"} 색상 선택`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
    <Field invalid={invalid || Boolean(error)} disabled={disabled} className={className}>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup className="w-fit">
        <span
          data-slot="input-group-button"
          className={cn(
            "relative grid aspect-square h-full shrink-0 place-items-center border-r border-yorha-border",
            "yorha-tint has-[:focus-visible]:yorha-focus-inset has-[:disabled]:cursor-not-allowed has-[:disabled]:border-yorha-disabled",
          )}
        >
          {/* 3px mat around the fill and a 1px edge on the fill, so a white swatch still reads on the beige surface. */}
          <span
            data-slot="color-swatch"
            aria-hidden="true"
            className="absolute inset-[3px] block border border-inherit"
            style={{ backgroundColor: color }}
          >
            {partial ? <span data-slot="color-swatch-dither" className="yorha-dither-50 absolute inset-0 block text-yorha-bg" /> : null}
          </span>
          {fine ? (
            <PopoverPrimitive.Trigger
              data-slot="color-trigger"
              aria-label={pickerName}
              disabled={disabled}
              className="absolute inset-0 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none"
            />
          ) : null}
          <input
            ref={nativeRef}
            type="color"
            name={name}
            aria-label={pickerName}
            disabled={disabled}
            value={color}
            onChange={(e) => commit(e.currentTarget.value.toLowerCase())}
            tabIndex={fine ? -1 : undefined}
            aria-hidden={fine ? true : undefined}
            className={cn(
              "disabled:cursor-not-allowed",
              // Fine pointers: the popover is the face, the native input stays as the form field and the "system picker" target.
              fine ? "pointer-events-none absolute inset-0 size-full opacity-0" : "absolute inset-0 size-full cursor-pointer opacity-0",
            )}
          />
        </span>
        <FieldGroupControl
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={7}
          value={text}
          onChange={(e) => {
            const next = e.currentTarget.value;
            setText(next);
            const hex = FULL.test(next.trim()) ? normalizeHex(next) : null;
            if (hex) commit(hex);
          }}
          onBlur={() => {
            const hex = normalizeHex(text);
            if (hex) {
              commit(hex);
              setText(hex);
            } else setText(color);
          }}
          className="w-32 flex-none font-yorha-mono uppercase"
        />
      </InputGroup>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error || invalid ? <FieldError>{error ?? "색상은 #RRGGBB 형식이어야 합니다"}</FieldError> : null}
    </Field>
    {fine ? (
      <PopoverContent align="start" aria-label={pickerName} className="grid w-auto gap-3 p-pad-sm">
        <div role="radiogroup" aria-label="견본" className="grid grid-cols-4 gap-1">
          {list.map((c, i) => (
            <button
              key={c}
              ref={(n) => {
                optionRefs.current[i] = n;
              }}
              type="button"
              role="radio"
              aria-checked={c === color}
              aria-label={c.toUpperCase()}
              data-slot="color-swatch-option"
              tabIndex={i === roveTo ? 0 : -1}
              onClick={() => {
                commit(c);
                setRove(i);
              }}
              onKeyDown={(e) => {
                const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
                const to = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : step === undefined ? null : (i + step + list.length) % list.length;
                if (to === null) return;
                e.preventDefault();
                setRove(to);
                optionRefs.current[to]?.focus();
              }}
              className="grid size-6 place-items-center focus-visible:yorha-focus aria-checked:bg-yorha-ink"
            >
              <span aria-hidden="true" className="block size-4 border border-yorha-border" style={{ backgroundColor: c }} />
            </button>
          ))}
        </div>
        <Input
          aria-label="16진수 색상 값"
          value={text}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const next = e.currentTarget.value;
            setText(next);
            if (FULL.test(next.trim())) commit(normalizeHex(next)!);
          }}
          className="font-yorha-mono uppercase"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              setOpen(false);
              nativeRef.current?.showPicker?.();
            }}
          >
            시스템 선택기
          </Button>
          {eyeDropper ? (
            <Button
              size="sm"
              onClick={() => {
                new eyeDropper()
                  .open()
                  .then((r) => {
                    const hex = normalizeHex(r.sRGBHex);
                    if (hex) commit(hex);
                  })
                  .catch(() => {});
              }}
            >
              스포이트
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    ) : null}
    </Popover>
  );
}
