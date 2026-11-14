// Prepares the generated React Router fixture: removes template body CSS (per @yorha/init docs),
// sets <html> theme attributes, registers the routes. Usage: node fixture-setup.mjs <fixtureDir> <gallerySrc>
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dir, gallery] = process.argv.slice(2);
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
  root
    .replace('<html lang="en">', '<html lang="ko" data-theme="light" data-motion="full">')
    .replace("<Meta />", "<title>YoRHa e2e</title>\n        <Meta />"),
);

mkdirSync(join(dir, "app/routes"), { recursive: true });
rmSync(join(dir, "app/routes/home.tsx"), { force: true }); // template route, replaced by routes.ts below
// shadcn nests ui files as components/ui/<name>/<name>.tsx; resolve each import to wherever the item landed.
const resolveUi = (name) => (existsSync(join(dir, `app/components/ui/${name}.tsx`)) ? name : `${name}/${name}`);
writeFileSync(
  join(dir, "app/routes/gallery.tsx"),
  readFileSync(gallery, "utf8").replace(/~\/components\/ui\/([\w-]+)"/g, (_, n) => `~/components/ui/${resolveUi(n)}"`),
);
const demo = existsSync(join(dir, "app/routes/yorha-demo.tsx")) ? "routes/yorha-demo.tsx" : "routes/routes/yorha-demo.tsx";
if (!existsSync(join(dir, "app", demo))) throw new Error("yorha-demo route file not found");
writeFileSync(
  join(dir, "app/routes.ts"),
  `import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/gallery.tsx"),
  route("yorha-demo", "${demo}"),
] satisfies RouteConfig;
`,
);
console.log(`removed ${removed} template rule(s) from app.css`);
