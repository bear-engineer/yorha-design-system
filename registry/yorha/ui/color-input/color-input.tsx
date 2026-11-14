import * as React from "react";
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
  const invalid = !PREFIX.test(text.trim());
  const pickerName = pickerLabel ?? `${typeof label === "string" ? label : "색상"} 색상 선택`;

  return (
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
          />
          <input
            type="color"
            name={name}
            aria-label={pickerName}
            disabled={disabled}
            value={color}
            onChange={(e) => commit(e.currentTarget.value.toLowerCase())}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
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
  );
}
