import * as React from "react";
import { Field, FieldDescription, FieldError, FieldGroupControl, FieldLabel, type FieldControlProps } from "@/components/ui/field";
import { CrossIcon, SearchIcon } from "@/components/ui/icons";
import { InputGroup, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";

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
      <InputGroup>
        <InputGroupAddon align="start">
          <SearchIcon />
        </InputGroupAddon>
        <FieldGroupControl
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
          className="[&::-webkit-search-cancel-button]:appearance-none"
          {...props}
        />
        {/* Stays mounted while the field is editable so showing it never resizes the group; absent when disabled or read-only. */}
        {disabled || props.readOnly ? null : (
          <InputGroupButton
            aria-label={clearLabel}
            onClick={clear}
            tabIndex={text ? undefined : -1}
            className={text ? undefined : "invisible"}
          >
            <CrossIcon />
          </InputGroupButton>
        )}
      </InputGroup>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
});
