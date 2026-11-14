// Prepares the generated React Router fixture: removes template body CSS (per @yorha/init docs),
// sets <html> theme attributes, registers the routes. Usage: node fixture-setup.mjs <fixtureDir> <gallerySrc>
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [dir, gallery] = process.argv.slice(2);
const srcDir = dirname(fileURLToPath(import.meta.url));
const cssPath = join(dir, "app/app.css");
let css = readFileSync(cssPath, "utf8");
// Remove every unlayered top-level `html, body { ... }` rule of the template (brace matching).
let removed = 0;
for (;;) {
  const m = /^(html\s*,\s*body|html|body)\s*\{/m.exec(css);
  if (!m) break;
  let depth = 0,
    end = m.index;
  for (let i = m.index; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) {
      end = i + 1;
      break;
    }
  }
  css = css.slice(0, m.index) + css.slice(end);
  removed++;
}
if (removed === 0) throw new Error("template app.css had no html/body rule to remove: template changed?");
writeFileSync(cssPath, css);

const rootPath = join(dir, "app/root.tsx");
const root = readFileSync(rootPath, "utf8");
if (!root.includes('<html lang="en">')) throw new Error('root.tsx has no <html lang="en">');
if (!root.includes("<Meta />")) throw new Error("root.tsx has no <Meta />");
// Pages need a <title> (axe document-title); the yorha-demo block ships no meta export, so set it in the root layout.
writeFileSync(
  rootPath,
  // route-transition registers a popstate listener at import: it must load before the router is created.
  `import "~/components/route-transition";\n` +
    root
    .replace('<html lang="en">', '<html lang="ko" data-theme="light">')
    .replace("<Meta />", "<title>YoRHa e2e</title>\n        <Meta />"),
);

mkdirSync(join(dir, "app/routes"), { recursive: true });
rmSync(join(dir, "app/routes/home.tsx"), { force: true }); // template route, replaced by routes.ts below
writeFileSync(
  join(dir, "app/routes/gallery.tsx"),
  readFileSync(gallery, "utf8"),
);
// Block routes are installed by `shadcn add` at app/routes/<name>.tsx; every one must exist before it is registered.
const blockRoutes = ["yorha-demo", "bento-dashboard", "settings-form"];
for (const name of blockRoutes) {
  if (!existsSync(join(dir, "app/routes", `${name}.tsx`))) throw new Error(`block route file not found: app/routes/${name}.tsx`);
}
// Transitions fixture routes (e2e/transitions.spec.ts runs against the installed route-transition component).
const tdir = join(dir, "app/routes/transitions");
mkdirSync(tdir, { recursive: true });
for (const [from, to] of [["layout.tsx", "layout.tsx"], ["list.tsx", "transitions-list.tsx"], ["detail.tsx", "detail.tsx"]]) {
  writeFileSync(join(tdir, to), readFileSync(join(srcDir, "transitions", from), "utf8"));
}
writeFileSync(
  join(dir, "app/routes.ts"),
  `import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/gallery.tsx"),
${blockRoutes.map((n) => `  route("${n}", "routes/${n}.tsx"),`).join("\n")}
  route("transitions", "routes/transitions/layout.tsx", [
    index("routes/transitions/transitions-list.tsx"),
    route(":id", "routes/transitions/detail.tsx"),
  ]),
] satisfies RouteConfig;
`,
);
console.log(`removed ${removed} template rule(s) from app.css`);
