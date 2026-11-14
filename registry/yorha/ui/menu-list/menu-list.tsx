import * as React from "react";

// RED stub: compiles, renders the wrong thing.
export interface MenuListProps extends React.ComponentProps<"ul"> {
  variant?: "listbox" | "navigation";
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  onActivate?: (value: string) => void;
  sound?: boolean;
}
export function MenuList({ variant, value, defaultValue, onValueChange, onActivate, sound, ...props }: MenuListProps) {
  void [variant, value, defaultValue, onValueChange, onActivate, sound];
  return <ul {...props} />;
}

export interface MenuListItemProps extends Omit<React.ComponentProps<"li">, "value"> {
  value: string;
  disabled?: boolean;
  description?: React.ReactNode;
  textValue?: string;
  current?: boolean;
  render?: React.ReactElement;
}
export function MenuListItem({ value, disabled, description, textValue, current, render, ...props }: MenuListItemProps) {
  void [value, disabled, description, textValue, current, render];
  return <li {...props} />;
}
