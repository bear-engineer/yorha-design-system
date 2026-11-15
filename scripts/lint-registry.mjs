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
// v4 motion rules (errors under YORHA_MOTION_STRICT=1, like `motion`): fx-keyframes-mix (L1: a @keyframes set that sets clip-path or
// mask-image together with opacity falls off the compositor; split it), fx-keyframes-props (L2: @keyframes may animate only opacity,
// transform, translate, scale, rotate, clip-path and), raw `steps(` and any --yorha-step-* / ease-yorha-step-* in .tsx (L3, flipped: motion is smooth, use ease-yorha-out / ease-yorha-move), fx-on-control (L4: yorha-glitch / yorha-flicker next to yorha-wipe, yorha-press, hover: or focus-visible:).
// Rule `pixel` (L6; warning, error with env YORHA_PIXEL_STRICT=1 or options.pixelStrict): rotate-45 / rotate-[...], <svg> without
// shapeRendering="crispEdges", a scale transition class on a line that renders a Glyph or *Icon. `lint-allow pixel: <reason>` allows it.
// Rule `craft` (G16; warning, error with env YORHA_CRAFT_STRICT=1 or options.craftStrict - the sweeps that fix the existing
// components land first, then the gate flips): display:grid|flex on td/th; opacity-based disabled; text-shadow-yorha outside
// heading.tsx; leading-yorha-tight|snug in components; inline <svg> in ui/ outside icons and timeline; text glyphs used as icons;
// fractional arbitrary lengths; yorha-press on grouped items (border-l/r, td, menuitem/option/tab). Raw h-8|10|12 / size-8|10|12 on
// button, input and [role] elements in ui/ only ever warns (use the h-control-* scale).
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

const FX_KEYFRAME_PROPS = new Set(["opacity", "transform", "translate", "scale", "rotate", "clip-path"]);
const FX_MASK = /^(?:-webkit-)?mask-image$/;
const RAW_STEPS = /(?<![\w-])steps\s*\(/g;
const STEP_TOKEN = /(?:--yorha-step-|ease-yorha-step-)[a-z]+/;
const FX_ONE_SHOT = /(?<![\w-])yorha-(?:glitch|flicker)(?![\w-])/;
const FX_CONTROL = /(?<![\w-])yorha-(?:wipe|press)(?![\w-])|(?<![\w-])(?:[\w[\]=&>/-]+:)*(?:hover|focus-visible):/;
const PIXEL_ALLOW = /lint-allow pixel:\s*\S/;
const SCALE_TRANSITION = /(?<![\w-])(?:[\w[\]=&>/-]+:)*scale-[\w./[\]-]+|transition-\[[^\]]*\bscale\b/;
const GLYPH_RENDER = /<(?:Glyph|\w+Icon)\b/;

/** `@keyframes` blocks anywhere in a registry item's css object: [{ name, frames: { selector: { prop: value } } }]. */
function keyframeBlocks(css, out = []) {
  for (const [key, value] of Object.entries(css ?? {})) {
    if (!value || typeof value !== "object") continue;
    if (key.startsWith("@keyframes ")) out.push({ name: key.slice("@keyframes ".length).trim(), frames: value });
    else keyframeBlocks(value, out);
  }
  return out;
}
const keyframeFindings = (css) =>
  keyframeBlocks(css).flatMap(({ name, frames }) => {
    const props = new Set(Object.values(frames).flatMap((body) => Object.keys(body ?? {})));
    const out = [];
    const mixed = Object.entries(frames).find(([, body]) => {
      const set = Object.keys(body ?? {});
      return set.some((prop) => prop === "clip-path" || FX_MASK.test(prop)) && set.includes("opacity");
    });
    if (mixed) out.push(`css @keyframes ${name}: fx-keyframes-mix: "${mixed[0]}" sets opacity together with clip-path or mask-image (split into two keyframes sets so each stays on the compositor)`);
    for (const prop of props) {
      const allowed = FX_KEYFRAME_PROPS.has(prop);
      if (!allowed) out.push(`css @keyframes ${name}: fx-keyframes-props: animates "${prop}" (allowed: opacity, transform, translate, scale, rotate, clip-path)`);
    }
    return out;
  });

/** `pixel` findings for one file's comment-free source; `raw` keeps comments for the allow-list. */
function pixelFindings(code, raw = code) {
  const lineOf = (index) => code.slice(0, index).split("\n").length;
  const rawLines = raw.split("\n");
  const allowed = (line) => PIXEL_ALLOW.test(rawLines[line - 1] ?? "") || PIXEL_ALLOW.test(rawLines[line - 2] ?? "");
  const out = [];
  const add = (index, message) => {
    const line = lineOf(index);
    if (!allowed(line)) out.push(`${line} pixel: ${message}`);
  };
  for (const m of code.matchAll(/(?<![\w-])(?:[\w[\]=&>/-]+:)*-?rotate-(?:45|\[[^\]]+\])(?![\w-])/g)) add(m.index, `"${m[0]}" rotates off the pixel grid (draw the shape as a glyph or a clip-path polygon)`);
  for (const m of code.matchAll(/<svg\b[^>]*>/g)) if (!/shapeRendering=["{]*["']?crispEdges/.test(m[0])) add(m.index, '<svg> without shapeRendering="crispEdges"');
  code.split("\n").forEach((line, index) => {
    if (GLYPH_RENDER.test(line) && SCALE_TRANSITION.test(line) && !allowed(index + 1)) out.push(`${index + 1} pixel: scale transition on a glyph or icon (use stepped clip-path or opacity)`);
  });
  return out;
}

const CLASS_TOKEN = (name) => new RegExp(`(?<![\\w-])${name}(?![\\w-])`);
const TAG = /<([A-Za-z][\w.]*)\b([^<>]*?)\/?>/g;
const SIZE_UTILITY = /(?<![\w-])(?:[\w[\]=&>/-]+:)*((?:h|size)-(?:8|10|12))(?![\w.-])/;
const GLYPH = /(?:>|["'`])\s*(×|−|⠿|✔)\s*(?:<|["'`])|>\s*(\+)\s*</;
const FRACTIONAL = /(?<![\w-])(?:[\w[\]=&>/-]+:)*[a-z][\w-]*-\[-?\d*\.\d+(?:px|rem|em)\]/g;
const OPACITY_DISABLED = /(?<![\w-])(?:[\w[\]=&>/-]+:)*[\w[\]=&>/-]*disabled[\w[\]=&>/-]*:opacity-[\w./[\]-]+/;

/** `craft` findings for one file: [{ line, message, soft }] (soft = warns even when craft is strict). */
function craftFindings(code, relPath) {
  const lineOf = (index) => code.slice(0, index).split("\n").length;
  const out = [];
  const file = basename(relPath);
  const inUi = /(^|\/)ui\//.test(relPath.split(sep).join("/"));
  const add = (index, message, soft = false) => out.push({ line: lineOf(index), message: `craft: ${message}`, soft });
  for (const m of code.matchAll(TAG)) {
    const [tag, name, attrs] = m;
    const lower = name.toLowerCase();
    if ((lower === "td" || lower === "th") && /className=/.test(attrs)) {
      const hit = ["grid", "flex", "inline-flex", "inline-grid"].find((u) => CLASS_TOKEN(u).test(attrs));
      if (hit) add(m.index, `display:${hit.replace("inline-", "")} on a table cell (wrap the content in a div; a flex/grid td leaves the table layout)`);
    }
    if (/(?<![\w-])yorha-press(?![\w-])/.test(attrs) && (lower === "td" || /(?<![\w-])border-[lr](?![\w-])/.test(attrs) || /role=["{]*["']?(menuitem|option|tab)\b/.test(attrs))) {
      add(m.index, "yorha-press on a grouped item (td, border-l/r, menuitem, option, tab); the press scale belongs to standalone buttons, use a tint");
    }
    if (inUi && (lower === "button" || lower === "input" || /role=/.test(attrs))) {
      const size = SIZE_UTILITY.exec(attrs);
      if (size) add(m.index, `raw ${size[1]} on a control (use the h-control-* scale)`, true);
    }
    void tag;
  }
  for (const m of code.matchAll(new RegExp(OPACITY_DISABLED.source, "g"))) add(m.index, "opacity-based disabled (use yorha-disabled / the --yorha-disabled colour; opacity washes out the whole control)");
  if (file !== "heading.tsx") for (const m of code.matchAll(/(?<![\w-])text-shadow-yorha(?![\w-])/g)) add(m.index, "text-shadow-yorha outside heading.tsx");
  for (const m of code.matchAll(/(?<![\w-])leading-yorha-(tight|snug)(?![\w-])/g)) add(m.index, `leading-yorha-${m[1]} in a component (use the text-yorha-* size/line-height pair)`);
  if (inUi && !/(^|\/)(icons|timeline)\//.test(relPath.split(sep).join("/"))) {
    for (const m of code.matchAll(/<svg\b/g)) add(m.index, "inline <svg> outside icons/timeline (import from @ui/icons)");
    for (const m of code.matchAll(new RegExp(GLYPH.source, "g"))) add(m.index, `text glyph "${m[1] ?? m[2]}" used as an icon (import from @ui/icons)`);
  }
  for (const m of code.matchAll(FRACTIONAL)) add(m.index, `fractional arbitrary length "${m[0].replace(/^.*?:/, "")}" (stay on the 4px grid)`);
  return out;
}

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
    if (RAW_STEPS.test(line)) findings.push(`${index + 1} motion: raw steps() (motion is smooth: use ease-yorha-out / ease-yorha-move)`);
    RAW_STEPS.lastIndex = 0;
    if (STEP_TOKEN.test(line)) findings.push(`${index + 1} motion: step token (deprecated, motion is smooth: use ease-yorha-out / ease-yorha-move)`);
    if (FX_ONE_SHOT.test(line) && FX_CONTROL.test(line)) findings.push(`${index + 1} motion: fx-on-control: yorha-glitch / yorha-flicker next to yorha-wipe, yorha-press, hover: or focus-visible: (no glitch or flicker on a control)`);
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

export function lintRegistry(rootDir = process.cwd(), { motionStrict = process.env.YORHA_MOTION_STRICT === "1", craftStrict = process.env.YORHA_CRAFT_STRICT === "1", pixelStrict = process.env.YORHA_PIXEL_STRICT === "1" } = {}) {
  const errors = [];
  const warnings = [];
  const motion = motionStrict ? errors : warnings;
  const craft = craftStrict ? errors : warnings;
  const pixel = pixelStrict ? errors : warnings;
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
    for (const finding of keyframeFindings(item.css)) motion.push(`${item.name}: ${finding}`);
    for (const f of files) {
      const abs = resolve(dir, f.path);
      if (!existsSync(abs) || extname(abs) !== ".tsx") continue;
      const src = readFileSync(abs, "utf8");
      const code = stripComments(src);
      const hex = code.match(HEX);
      if (hex) errors.push(`${item.name}: ${f.path} hard-codes hex color ${[...new Set(hex)].join(", ")} (use tokens)`);
      if (OUTLINE_OFF.test(code) && !/focus-visible/.test(code)) errors.push(`${item.name}: ${f.path} removes outline without focus-visible replacement`);
      for (const finding of motionFindings(code, src)) motion.push(`${item.name}: ${f.path}:${finding}`);
      for (const finding of pixelFindings(code, src)) pixel.push(`${item.name}: ${f.path}:${finding}`);
      for (const finding of craftFindings(code, relative(rootDir, abs))) (finding.soft ? warnings : craft).push(`${item.name}: ${f.path}:${finding.line} ${finding.message}`);
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
  console.log(`registry lint ok (${includes} includes${warnings.length ? `, ${warnings.length} ${warnings.some((w) => w.includes(" craft: ")) ? "motion/craft " : "motion "}warnings` : ""})`);
}
