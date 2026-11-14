// Registry lint. Pure `lintRegistry(rootDir, options)` returns error and warning strings; the CLI prints them and sets the exit code.
// Rules: @yorha/ registryDependencies only; files exist; every item with files has <name>.stories.tsx
// (registry:lib items are exempt, they are specified by unit tests); ui/component items list @yorha/base + @yorha/utils;
// every ui/lib/hook/component file has target @ui|@lib|@hooks|@components/<basename> (flat install);
// registry:ui items import only other items' primary files; no hex colors in .tsx; no outline removal without
// focus-visible in the same file; no audio/font binaries under registry/.
// Rule `motion` (warning; error with env YORHA_MOTION_STRICT=1 or options.motionStrict): no raw `NNNms`, no raw
// cubic-bezier(), no `transition-all` in registry .tsx; no transition on layout properties (width/height/top/left/margin/padding/
// border-width/font-weight/inset...) and no `hidden` + `group-data-[..]:block` display switches for state indicators; a
// Also: `transition-colors` on a line carrying `focus-visible:` classes.
// `lint-allow layout-transition: <reason>` comment on the line or the line above allows an unavoidable layout transition. Use --motion-* tokens, ease-yorha-* and the yorha-* motion utilities.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, basename, extname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const BINARY_EXT = new Set([".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".opus", ".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const OUTLINE_OFF = /outline\s*:\s*(?:none|0)\b|(?<![\w-])outline-none\b|outline-0\b/;
const TARGET_ALIAS = { "registry:ui": "@ui", "registry:lib": "@lib", "registry:hook": "@hooks", "registry:component": "@components" };
const IMPORT = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
const MOTION_HINT = "use a --motion-* token or a yorha-* motion utility";
const MOTION_RULES = [
  [/(?<![\w.])\d+(?:\.\d+)?ms\b/g, (match) => `raw duration "${match}"`],
  [/cubic-bezier\s*\(/g, () => "raw cubic-bezier()"],
  [/(?<![\w-])transition-all\b/g, () => "transition-all"],
];

// Layout properties: animating them re-runs layout every frame and moves neighbours. Animate transform, opacity or colour instead.
const LAYOUT_PROP = /^(?:width|height|top|left|right|bottom|inset(?:-[a-z]+)*|margin(?:-[a-z]+)*|padding(?:-[a-z]+)*|border(?:-[a-z]+)?-width|font-weight|(?:min|max)-(?:width|height)|gap|flex-basis|grid-template-(?:rows|columns))$/;
const TRANSITION_LIST = /(?<![\w-])(?:transition-\[([^\]]+)\]|\[transition-property:([^\]]+)\])/g;
// `transition-colors` includes outline-color, so a focus ring would fade in; a focusable element lists its colour properties instead.
const FOCUS_VISIBLE = /(?<![\w-])(?:[\w-]+:)*focus-visible:/;
const TRANSITION_COLORS = /(?<![\w-])transition-colors\b/;
const FOCUS_HINT = "use transition-[color,background-color,border-color]";
// A state indicator toggled by display: `hidden` in the base classes plus `group-data-[...]:block|flex|grid|inline*`.
const HIDDEN = /(?<![\w:-])hidden(?![\w-])/;
const DISPLAY_SWITCH = /(?<![\w-])((?:peer-|group-)?(?:data|aria)-\[[^\]]+\](?:\/[\w-]+)?:(?:block|flex|grid|inline-block|inline-flex|inline-grid|inline))(?![\w-])/;
const WIPE_HINT = "use the yorha-wipe utility for the selection wipe";
const LAYOUT_ALLOW = /lint-allow layout-transition:\s*\S/;
const LAYOUT_HINT = "animate transform, opacity or colour; allow only with a `lint-allow layout-transition: <reason>` comment";

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Block comments keep their line breaks so findings can name the source line.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, "")).replace(/(^|[^:])\/\/.*$/gm, "$1");

/** `motion` rule findings for one file's comment-free source, as "<line> motion: <what>" strings. `raw` keeps comments for allow-list lookup. */
function motionFindings(code, raw = code) {
  const rawLines = raw.split("\n");
  const findings = [];
  code.split("\n").forEach((line, index) => {
    for (const [pattern, describe] of MOTION_RULES) {
      for (const match of line.matchAll(pattern)) findings.push(`${index + 1} motion: ${describe(match[0])} (${MOTION_HINT})`);
    }
    for (const list of line.matchAll(TRANSITION_LIST)) {
      if ((list[1] ?? list[2]).split(/[,_\s]+/).includes("background-size")) findings.push(`${index + 1} motion: ad-hoc background-size transition (${WIPE_HINT})`);
    }
    const allowed = LAYOUT_ALLOW.test(rawLines[index] ?? "") || LAYOUT_ALLOW.test(rawLines[index - 1] ?? "");
    if (!allowed) {
      for (const list of line.matchAll(TRANSITION_LIST)) {
        for (const prop of (list[1] ?? list[2]).split(/[,_\s]+/).filter(Boolean)) {
          if (LAYOUT_PROP.test(prop)) findings.push(`${index + 1} motion: transition on layout property "${prop}" (${LAYOUT_HINT})`);
        }
      }
      if (FOCUS_VISIBLE.test(line) && TRANSITION_COLORS.test(line)) {
        findings.push(`${index + 1} motion: transition-colors on an element with focus-visible classes also eases the focus outline (${FOCUS_HINT})`);
      }
      if (HIDDEN.test(line)) {
        const sw = line.match(DISPLAY_SWITCH);
        if (sw) findings.push(`${index + 1} motion: state indicator toggled by display (\`hidden\` + \`${sw[1]}\`); keep it mounted and animate opacity/scale in a fixed box`);
      }
    }
  });
  return findings;
}

export function lintRegistry(rootDir = process.cwd(), { motionStrict = process.env.YORHA_MOTION_STRICT === "1" } = {}) {
  const errors = [];
  const warnings = [];
  const motion = motionStrict ? errors : warnings;
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
      // shadcn 4.23.0 nests files whose path has a segment named like the type folder (ui/button/button.tsx ->
      // components/ui/button/button.tsx); an explicit alias target pins the documented flat location.
      const alias = TARGET_ALIAS[f.type];
      if (alias && f.target !== `${alias}/${basename(f.path)}`) {
        errors.push(`${item.name}: ${f.path} (${f.type}) needs target "${alias}/${basename(f.path)}" for a flat consumer install`);
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
      for (const finding of motionFindings(code, src)) motion.push(`${item.name}: ${f.path}:${finding}`);
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
  return { errors, warnings, includes: (root.include ?? []).length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, warnings, includes } = lintRegistry(process.cwd());
  if (warnings.length) console.warn(warnings.map((warning) => `warning: ${warning}`).join("\n"));
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log(`registry lint ok (${includes} includes${warnings.length ? `, ${warnings.length} motion warnings` : ""})`);
}
