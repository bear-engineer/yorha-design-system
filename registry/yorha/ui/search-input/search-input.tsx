import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel, type FieldControlProps } from "@/components/ui/field";

export interface SearchInputProps
  extends Omit<FieldControlProps, "type" | "children" | "className" | "value" | "defaultValue" | "onChange"> {
  label: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the current text on Enter. */
  onSearch?: (value: string) => void;
  clearLabel?: string;
  description?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
}

/**
 * type=search input (role searchbox) with a clear button and Escape-to-clear. Clearing returns focus to the
 * input. The browser's own cancel button is hidden so there is one clear control.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { label, value, defaultValue = "", onValueChange, onSearch, clearLabel = "검색어 지우기", description, error, className, disabled, onKeyDown, ...props },
  ref,
) {
  const [inner, setInner] = React.useState(defaultValue);
  const text = value ?? inner;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };
  const update = (next: string) => {
    setInner(next);
    onValueChange?.(next);
  };
  const clear = () => {
    update("");
    inputRef.current?.focus();
  };
  return (
    <Field invalid={Boolean(error)} disabled={disabled} className={className}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative flex items-center">
        <FieldControl
          ref={setRefs}
          type="search"
          autoComplete="off"
          value={text}
          onChange={(e) => update(e.currentTarget.value)}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.defaultPrevented) return;
            if (e.key === "Escape" && text) {
              e.preventDefault();
              e.stopPropagation();
              clear();
            } else if (e.key === "Enter") {
              onSearch?.(e.currentTarget.value);
            }
          }}
          className="pr-11! [&::-webkit-search-cancel-button]:appearance-none"
          {...props}
        />
        {text ? (
          <Button
            variant="ghost"
            size="sm"
            square
            aria-label={clearLabel}
            disabled={disabled}
            onClick={clear}
            className="absolute right-1"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </Button>
        ) : null}
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
});
