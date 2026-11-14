import * as React from "react";
export interface YorhaRadioGroupProps { children?: React.ReactNode; [k: string]: unknown }
export function RadioGroup({ children }: YorhaRadioGroupProps) { return <div>{children}</div>; }
export function Radio(_props: { value: string; children?: React.ReactNode; disabled?: boolean }) { return <span />; }
