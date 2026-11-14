// Registry lint. Pure `lintRegistry(rootDir)` returns error strings; the CLI prints them and sets the exit code.
// Rules: @yorha/ registryDependencies only; files exist; every item with files has <name>.stories.tsx
// (registry:lib items are exempt, they are specified by unit tests); ui/component items list @yorha/base + @yorha/utils;
// registry:ui items import only other items' primary files; no hex colors in .tsx; no outline removal without
// focus-visible in the same file; no audio/font binaries under registry/.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, basename, extname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const BINARY_EXT = new Set([".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".opus", ".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const OUTLINE_OFF = /outline\s*:\s*(?:none|0)\b|(?<![\w-])outline-none\b|outline-0\b/;
const IMPORT = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

export function lintRegistry(rootDir = process.cwd()) {
  const errors = [];
  const root = JSON.parse(readFileSync(join(rootDir, "registry.json"), "utf8"));
  const entries = []; // { item, dir }
  for (const inc of root.include ?? []) {
    const incPath = join(rootDir, inc);
    if (!existsSync(incPath)) { errors.push(`missing include ${inc}`); continue; }
    const reg = JSON.parse(readFileSync(incPath, "utf8"));
    for (const item of reg.items ?? []) entries.push({ item, dir: dirname(incPath) });
  }

  // primary file per item = file whose basename (sans ext) equals the item name
  const primaryByDir = new Map();
  const ownerByFile = new Map(); // absolute file -> { item, primary }
  for (const { item, dir } of entries) {
    for (const f of item.files ?? []) {
      const abs = resolve(dir, f.path);
      const primary = basename(f.path, extname(f.path)) === item.name;
      ownerByFile.set(abs, { item, primary });
      if (primary) primaryByDir.set(dir, abs);
    }
  }
  // alias import path ("@/components/ui/x") -> file basename; a non-primary hit in another item is a violation
  const nonPrimaryBase = new Map(); // basename sans ext -> item name
  for (const [abs, o] of ownerByFile) if (!o.primary) nonPrimaryBase.set(basename(abs, extname(abs)), o.item.name);
  const primaryNames = new Set(entries.map((e) => e.item.name));

  for (const { item, dir } of entries) {
    const files = item.files ?? [];
    const deps = item.registryDependencies ?? [];
    for (const dep of deps) {
      if (!dep.startsWith("@yorha/") && !/^https?:\/\//.test(dep)) errors.push(`${item.name}: bare registryDependency "${dep}" (use @yorha/...)`);
    }
    for (const f of files) {
      if (!existsSync(join(dir, f.path))) errors.push(`${item.name}: file not found ${join(dir, f.path)}`);
    }
    if (files.length && item.type !== "registry:lib" && !existsSync(join(dir, `${item.name}.stories.tsx`))) {
      errors.push(`${item.name}: missing story ${item.name}.stories.tsx`);
    }
    if (item.type === "registry:ui" || item.type === "registry:component") {
      for (const need of ["@yorha/base", "@yorha/utils"]) {
        if (!deps.includes(need)) errors.push(`${item.name}: ${item.type} must list ${need} in registryDependencies`);
      }
    }
    for (const f of files) {
      const abs = resolve(dir, f.path);
      if (!existsSync(abs) || extname(abs) !== ".tsx") continue;
      const src = readFileSync(abs, "utf8");
      const code = stripComments(src);
      const hex = code.match(HEX);
      if (hex) errors.push(`${item.name}: ${f.path} hard-codes hex color ${[...new Set(hex)].join(", ")} (use tokens)`);
      if (OUTLINE_OFF.test(code) && !/focus-visible/.test(code)) errors.push(`${item.name}: ${f.path} removes outline without focus-visible replacement`);
      if (item.type === "registry:ui") {
        for (const m of src.matchAll(IMPORT)) {
          const spec = m[1];
          if (spec.startsWith("@/")) {
            const leaf = spec.split("/").pop();
            if (!primaryNames.has(leaf) && nonPrimaryBase.has(leaf) && nonPrimaryBase.get(leaf) !== item.name) {
              errors.push(`${item.name}: ${f.path} imports non-primary file "${spec}" of ${nonPrimaryBase.get(leaf)}`);
            }
          } else if (spec.startsWith(".")) {
            const target = resolve(dirname(abs), spec);
            for (const [file, o] of ownerByFile) {
              if (o.item.name !== item.name && file.slice(0, -extname(file).length) === target && !o.primary) {
                errors.push(`${item.name}: ${f.path} imports non-primary file "${spec}" of ${o.item.name}`);
              }
            }
          }
        }
      }
    }
  }

  const regDir = join(rootDir, "registry");
  for (const p of walk(regDir)) {
    if (BINARY_EXT.has(extname(p).toLowerCase())) errors.push(`binary audio/font not allowed in registry: ${relative(rootDir, p).split(sep).join("/")}`);
  }
  return { errors, includes: (root.include ?? []).length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, includes } = lintRegistry(process.cwd());
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log(`registry lint ok (${includes} includes)`);
}
