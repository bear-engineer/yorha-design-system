import { createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";
import "../src/styles/storybook.css";
import { Button } from "../registry/yorha/ui/button/button";
import { IconButton } from "../registry/yorha/ui/icon-button/icon-button";
import { Input } from "../registry/yorha/ui/input/input";
import { Switch } from "../registry/yorha/ui/switch/switch";
import { Checkbox } from "../registry/yorha/ui/checkbox/checkbox";
import { frames } from "./mount";

/**
 * Prop-driven axis (M02): toggling loading / disabled / invalid on a mounted control must keep its
 * offsetWidth and offsetHeight identical (the user rule: a state change never resizes a control).
 */
const roots: { unmount: () => void; el: HTMLElement }[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) {
    r.unmount();
    r.el.remove();
  }
});

interface Case {
  name: string;
  render: (props: Record<string, boolean>) => ReactElement;
  /** The element whose box is measured. */
  target: (host: HTMLElement) => HTMLElement;
  states: Record<string, boolean>[];
}

const host = (host: HTMLElement) => host.querySelector<HTMLElement>("button, input, [role=switch], [role=checkbox]")!;

const CASES: Case[] = [
  {
    name: "button",
    render: (p) => createElement(Button, { loading: p.loading, disabled: p.disabled, "aria-invalid": p.invalid || undefined }, "저장"),
    target: host,
    states: [{}, { loading: true }, { disabled: true }, { loading: true, disabled: true }, { invalid: true }],
  },
  {
    name: "button (long label, primary lg)",
    render: (p) => createElement(Button, { variant: "primary", size: "lg", loading: p.loading, disabled: p.disabled }, "변경 사항 저장하기"),
    target: host,
    states: [{}, { loading: true }, { disabled: true }],
  },
  {
    name: "icon-button",
    render: (p) => createElement(IconButton, { "aria-label": "닫기", loading: p.loading, disabled: p.disabled }, "×"),
    target: host,
    states: [{}, { loading: true }, { disabled: true }, { loading: true, disabled: true }],
  },
  {
    name: "input",
    render: (p) => createElement(Input, { "aria-label": "이름", disabled: p.disabled, "aria-invalid": p.invalid || undefined }),
    target: host,
    states: [{}, { invalid: true }, { disabled: true }],
  },
  {
    name: "switch",
    render: (p) => createElement(Switch, { disabled: p.disabled, "aria-invalid": p.invalid || undefined }, "알림"),
    target: host,
    states: [{}, { disabled: true }, { invalid: true }],
  },
  {
    name: "checkbox",
    render: (p) => createElement(Checkbox, { disabled: p.disabled, "aria-invalid": p.invalid || undefined }, "동의"),
    target: host,
    states: [{}, { disabled: true }, { invalid: true }],
  },
];

describe("prop transitions (loading/disabled/invalid) keep offsetWidth/offsetHeight identical", () => {
  for (const c of CASES) {
    test(c.name, async () => {
      const el = document.createElement("div");
      el.lang = "ko";
      document.body.append(el);
      const root = createRoot(el);
      roots.push({ unmount: () => root.unmount(), el });
      const sizes: string[] = [];
      for (const state of c.states) {
        root.render(c.render(state));
        await frames(3);
        await document.fonts.ready;
        const t = c.target(el);
        sizes.push(`${JSON.stringify(state)} → ${t.offsetWidth}×${t.offsetHeight}`);
      }
      const unique = new Set(sizes.map((s) => s.split("→")[1]));
      expect(unique.size, sizes.join("\n")).toBe(1);
    });
  }
});
