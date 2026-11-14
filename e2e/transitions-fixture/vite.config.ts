import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const registryPath = fileURLToPath(new URL("../../registry/yorha/router/route-transition/registry.json", import.meta.url));

type CssNode = string | { [key: string]: CssNode };

function toCss(node: { [key: string]: CssNode }, indent = ""): string {
  return Object.entries(node)
    .map(([key, value]) =>
      typeof value === "string"
        ? `${indent}${key}: ${value};\n`
        : `${indent}${key} {\n${toCss(value, `${indent}  `)}${indent}}\n`,
    )
    .join("");
}

/** Turns the item's registry.json `css` into a stylesheet, so the test exercises the shipped CSS. */
function yorhaRouteCss(): Plugin {
  const id = "virtual:yorha-route-css";
  return {
    name: "yorha-route-css",
    resolveId: (source) => (source === id ? `\0${id}.css` : null),
    load(loaded) {
      if (loaded !== `\0${id}.css`) return null;
      this.addWatchFile(registryPath);
      const item = (JSON.parse(readFileSync(registryPath, "utf8")) as { items: { css: { [key: string]: CssNode } }[] }).items[0]!;
      return toCss(item.css);
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), yorhaRouteCss()],
  server: { port: 5199, strictPort: true, fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] } },
});
