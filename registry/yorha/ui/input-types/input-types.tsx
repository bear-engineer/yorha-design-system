/** Every HTML `<input type>` value, alphabetical. */
export const INPUT_TYPES = [
  "button",
  "checkbox",
  "color",
  "date",
  "datetime-local",
  "email",
  "file",
  "hidden",
  "image",
  "month",
  "number",
  "password",
  "radio",
  "range",
  "reset",
  "search",
  "submit",
  "tel",
  "text",
  "time",
  "url",
  "week",
] as const;

export type InputType = (typeof INPUT_TYPES)[number];

export interface InputTypeOwner {
  /** Install alias of the item that renders this type. */
  item: string;
  /** How the type reaches the DOM. */
  how: string;
}

/** Which yorha item owns each input type. The AllInputTypes story renders this table. */
export const INPUT_TYPE_TABLE: Record<InputType, InputTypeOwner> = {
  button: { item: "@/components/ui/button", how: "buttonVariants() on a native input type=button" },
  checkbox: { item: "@/components/ui/checkbox", how: "Base UI Checkbox renders the hidden native input" },
  color: { item: "@/components/ui/color-input", how: "ColorInput: native picker, swatch and hex field" },
  date: { item: "@/components/ui/date-input", how: "DateInput type=date, kit Calendar on fine pointers" },
  "datetime-local": { item: "@/components/ui/date-input", how: "DateInput type=datetime-local, Calendar + TimePicker" },
  email: { item: "@/components/ui/input", how: "Input with inputPresets.email" },
  file: { item: "@/components/ui/file-input", how: "FileInput: button, drop zone and file list" },
  hidden: { item: "none (no UI)", how: "Plain input type=hidden; carries a value with the form, has no label" },
  image: { item: "@/components/ui/button", how: "buttonVariants({ square }) on a native input type=image" },
  month: { item: "@/components/ui/date-input", how: "DateInput type=month, MonthPicker" },
  number: { item: "@/components/ui/input", how: "Input type=number (NumberField from @/components/ui/number-field renders type=text with steppers)" },
  password: { item: "@/components/ui/password-input", how: "PasswordInput: reveal toggle and Caps Lock hint" },
  radio: { item: "@/components/ui/radio-group", how: "Base UI Radio renders the hidden native input" },
  range: { item: "@/components/ui/slider", how: "Base UI Slider renders a native range input per thumb" },
  reset: { item: "@/components/ui/button", how: "buttonVariants() on a native input type=reset" },
  search: { item: "@/components/ui/search-input", how: "SearchInput: clear button, Escape clears" },
  submit: { item: "@/components/ui/button", how: "buttonVariants({ variant: \"primary\" }) on a native input type=submit" },
  tel: { item: "@/components/ui/input", how: "Input with inputPresets.tel" },
  text: { item: "@/components/ui/input", how: "Input with inputPresets.text" },
  time: { item: "@/components/ui/date-input", how: "DateInput type=time, TimePicker" },
  url: { item: "@/components/ui/input", how: "Input with inputPresets.url" },
  week: { item: "@/components/ui/date-input", how: "DateInput type=week, Calendar week mode" },
};

export interface InputPreset {
  type: "text" | "email" | "tel" | "url";
  inputMode: "text" | "email" | "tel" | "url";
  autoComplete: string;
  /** Label of the mobile keyboard's Enter key. */
  enterKeyHint: "enter" | "next" | "go" | "search" | "done";
  /** Source of a pattern attribute; the browser anchors it to the whole value. */
  pattern?: string;
}

/**
 * Attributes that make a text-like field behave: the right keyboard (inputMode), the right autofill
 * (autoComplete) and, for phone numbers, a permissive pattern. Spread onto Input from
 * `@/components/ui/input`: `<Input {...inputPresets.email} />`.
 */
export const inputPresets = {
  text: { type: "text", inputMode: "text", autoComplete: "off", enterKeyHint: "next" },
  email: { type: "email", inputMode: "email", autoComplete: "email", enterKeyHint: "next" },
  tel: { type: "tel", inputMode: "tel", autoComplete: "tel", enterKeyHint: "next", pattern: "[0-9+\\-\\s()]{7,20}" },
  url: { type: "url", inputMode: "url", autoComplete: "url", enterKeyHint: "go" },
} as const satisfies Record<string, InputPreset>;
