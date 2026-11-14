#!/usr/bin/env node
// Base UI coverage gate.
// Every public @base-ui/react component must be imported by a non-story registry
// file under registry/yorha/**, and every namespace part must be used there, unless
// coverage.exceptions.json waives it with a written reason.
//
// Usage: node scripts/base-ui-coverage.mjs [--report] [--out <file>]
//          [--root <dir>] [--base-ui <dir>] [--exceptions <file>]
// Exit: 0 when everything is covered, 1 on any failure, 2 on a crash.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXCLUDED = /^(internals\/|types$|merge-props$|use-render$|unstable-)/;
const SKIP_EXPORT = /(DataAttributes|CssVariables)$/;
const STORY = /\.stories\.tsx?$/;
const IMPORT_RE = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']@base-ui\/react\/([^"']+)["']/g;

const pascal = (component) => component.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
// Exports entries may nest conditions ({ import: { types, default }, require: { ... } }); take the first runnable leaf.
const targetOf = (entry) => {
  let t = entry;
  while (t && typeof t === "object") t = t.require ?? t.default ?? t.import;
  return typeof t === "string" ? t : undefined;
};

// Public component names from package.json "exports" (./<name> keys only).
export function listComponents(exportsMap) {
  return Object.keys(exportsMap)
    .filter((k) => k.startsWith("./"))
    .map((k) => k.slice(2))
    .filter((c) => c !== "package.json" && !EXCLUDED.test(c));
}

// Namespace object for a component and its parts (uppercase keys only).
// Single $$typeof components and function exports have no parts.
export function namespaceOf(component, mod) {
  const candidates = Object.keys(mod).filter((k) => {
    const v = mod[k];
    return !SKIP_EXPORT.test(k) && /^[A-Z]/.test(k) && v !== null && typeof v === "object" && !("$$typeof" in v);
  });
  const want = pascal(component);
  const name = candidates.includes(want) ? want : candidates.length === 1 ? candidates[0] : null;
  if (!name) return { name: null, parts: [] };
  const parts = Object.keys(mod[name]).filter((k) => /^[A-Z]/.test(k) && k !== "$$typeof");
  return { name, parts };
}

// Which registry directories import each component, and which `Local.Member` names they touch.
// Story files are skipped: a part used only by a story is not shipped coverage.
export function scanSources(files) {
  const usages = {};
  for (const { path, text } of files) {
    if (STORY.test(path)) continue;
    const dir = posix.dirname(path);
    for (const m of text.matchAll(IMPORT_RE)) {
      const component = m[2];
      const entry = (usages[component] ??= { dirs: new Set(), members: new Set() });
      entry.dirs.add(dir);
      for (const raw of m[1].split(",")) {
        const spec = raw.trim().replace(/^type\s+/, "");
        if (!spec) continue;
        const local = spec.split(/\s+as\s+/).pop();
        for (const mm of text.matchAll(new RegExp(`\\b${local}\\.([A-Za-z_$][\\w$]*)`, "g"))) {
          entry.members.add(mm[1]);
        }
      }
    }
  }
  const out = {};
  for (const [component, { dirs, members }] of Object.entries(usages)) {
    out[component] = { dirs: [...dirs], members: [...members] };
  }
  return out;
}

export function validateExceptions(exceptions, components) {
  if (!Array.isArray(exceptions)) return ["coverage.exceptions.json must be an array"];
  const errors = [];
  exceptions.forEach((e, i) => {
    const at = `coverage.exceptions.json[${i}]`;
    if (!e || typeof e !== "object" || typeof e.component !== "string") {
      errors.push(`${at}: component is required`);
      return;
    }
    if (typeof e.reason !== "string" || e.reason.trim() === "") {
      errors.push(`${at} (${e.component}): empty reason, a waiver must say why`);
    }
    const comp = components.find((c) => c.component === e.component);
    if (!comp) {
      errors.push(`${at}: unknown component "${e.component}"`);
      return;
    }
    if (e.part !== undefined && !comp.parts.includes(e.part)) {
      errors.push(`${at}: unknown part ${e.component}.${e.part}`);
    }
  });
  return errors;
}

export function computeCoverage(components, usages, exceptions) {
  const list = Array.isArray(exceptions) ? exceptions : [];
  const failures = validateExceptions(exceptions, components);
  const rows = components.map(({ component, namespace, parts }) => {
    const u = usages[component] ?? { dirs: [], members: [] };
    const covered = u.dirs.length > 0;
    const waivedComponent = list.some((e) => e && e.component === component && e.part === undefined);
    const waivedParts = new Set(list.filter((e) => e && e.component === component && e.part !== undefined).map((e) => e.part));
    const used = parts.filter((p) => u.members.includes(p));
    const waived = parts.filter((p) => !used.includes(p) && waivedParts.has(p));
    const missing = parts.filter((p) => !used.includes(p) && !waivedParts.has(p));
    if (!covered && !waivedComponent) {
      failures.push(`${component}: no registry item imports @base-ui/react/${component}`);
    }
    if (covered) {
      for (const p of missing) failures.push(`${component}: part ${namespace}.${p} not used in registry`);
    }
    return { component, namespace, dirs: u.dirs, total: parts.length, used, missing: covered ? missing : [], waived, covered, waivedComponent };
  });
  return { rows, failures };
}

export function renderMarkdown(rows, failures) {
  const covered = rows.filter((r) => r.covered).length;
  const partTotal = rows.reduce((n, r) => n + r.total, 0);
  const partUsed = rows.reduce((n, r) => n + r.used.length, 0);
  const lines = [
    "# Base UI coverage",
    "",
    `Components with a registry item: ${covered}/${rows.length} · parts used: ${partUsed}/${partTotal}`,
    "",
    "| Component | Item dir | Parts used/total | Missing |",
    "|---|---|---|---|",
  ];
  for (const r of rows) {
    const dirs = r.dirs.length ? r.dirs.join(", ") : "—";
    let missing;
    if (!r.covered && !r.waivedComponent) missing = "**미대응** (component)";
    else if (r.waivedComponent && !r.covered) missing = "waived (component)";
    else missing = r.missing.length ? r.missing.map((p) => `${r.namespace}.${p}`).join(", ") : "—";
    if (r.waived.length) missing += ` (waived: ${r.waived.join(", ")})`;
    lines.push(`| ${r.component} | ${dirs} | ${r.used.length}/${r.total} | ${missing} |`);
  }
  lines.push("", failures.length ? "## Failures" : "All components and parts covered.");
  for (const f of failures) lines.push(`- ${f}`);
  return lines.join("\n") + "\n";
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function registryFiles(root) {
  const base = join(root, "registry", "yorha");
  if (!existsSync(base)) return [];
  return walk(base, []).map((p) => ({
    path: relative(root, p).split(sep).join(posix.sep),
    text: readFileSync(p, "utf8"),
  }));
}

export function runCoverage({
  root = DEFAULT_ROOT,
  baseUiDir = join(root, "node_modules", "@base-ui", "react"),
  exceptionsPath = join(root, "coverage.exceptions.json"),
} = {}) {
  const pkg = JSON.parse(readFileSync(join(baseUiDir, "package.json"), "utf8"));
  const req = createRequire(join(baseUiDir, "package.json"));
  const components = listComponents(pkg.exports).map((component) => {
    const target = targetOf(pkg.exports[`./${component}`]);
    if (!target) throw new Error(`no require/default/import target for ./${component}`);
    const { name, parts } = namespaceOf(component, req(resolve(baseUiDir, target)));
    return { component, namespace: name, parts };
  });
  const usages = scanSources(registryFiles(root));
  let exceptions = [];
  let parseError = null;
  if (existsSync(exceptionsPath)) {
    try {
      exceptions = JSON.parse(readFileSync(exceptionsPath, "utf8"));
    } catch (e) {
      parseError = `coverage.exceptions.json: invalid JSON (${e.message})`;
    }
  }
  const { rows, failures } = computeCoverage(components, usages, parseError ? [] : exceptions);
  if (parseError) failures.unshift(parseError);
  return { rows, failures, markdown: renderMarkdown(rows, failures) };
}

function parseArgs(argv) {
  const o = { report: false, out: null, root: DEFAULT_ROOT, baseUiDir: null, exceptionsPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--report") o.report = true;
    else if (a === "--out") o.out = argv[++i];
    else if (a === "--root") o.root = resolve(argv[++i]);
    else if (a === "--base-ui") o.baseUiDir = resolve(argv[++i]);
    else if (a === "--exceptions") o.exceptionsPath = resolve(argv[++i]);
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

function main(argv) {
  const o = parseArgs(argv);
  const result = runCoverage({
    root: o.root,
    baseUiDir: o.baseUiDir ?? join(o.root, "node_modules", "@base-ui", "react"),
    exceptionsPath: o.exceptionsPath ?? join(o.root, "coverage.exceptions.json"),
  });
  if (o.out) writeFileSync(resolve(o.out), result.markdown);
  if (o.report) process.stdout.write(result.markdown);
  if (result.failures.length) {
    process.stderr.write(`base-ui coverage: ${result.failures.length} failure(s)\n`);
    for (const f of result.failures) process.stderr.write(`  - ${f}\n`);
    return 1;
  }
  process.stderr.write(`base-ui coverage: OK (${result.rows.length} components)\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`base-ui coverage: crashed: ${e.message}\n`);
    process.exitCode = 2;
  }
}
