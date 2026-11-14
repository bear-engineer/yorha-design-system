// Prints the files shadcn must place for each built item (relative to the fixture root).
// Usage: node e2e/expected-files.mjs <public/r dir> [item...]   (no items = every item in registry/items.json)
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const itemsJson = fileURLToPath(new URL("../registry/items.json", import.meta.url));

const [rDir, ...names] = process.argv.slice(2);
const items = names.length ? names : JSON.parse(readFileSync(itemsJson, "utf8")).map((i) => i.name);
const dir = { "registry:ui": "app/components/ui", "registry:lib": "app/lib", "registry:hook": "app/hooks", "registry:component": "app/components" };
const seg = { "registry:ui": "ui", "registry:lib": "lib", "registry:hook": "hooks", "registry:component": "components" };
// Output: item <TAB> flat target (what the docs/imports imply) <TAB> observed shadcn 4.23.0 placement.
// shadcn keeps the path remainder after a segment named like the type folder (ui/button/button.tsx -> components/ui/button/button.tsx),
// and resolves registry:page targets below app/routes. install.sh accepts either location and logs the difference.
for (const name of items) {
  const item = JSON.parse(readFileSync(join(rDir, `${name}.json`), "utf8"));
  for (const f of item.files ?? []) {
    if (f.target) {
      console.log(`${name}\t${f.target}\t${join("app/routes", f.target.replace(/^app\//, ""))}`);
      continue;
    }
    if (!dir[f.type]) { console.error(`cannot place ${name}: ${f.path} (${f.type})`); process.exit(2); }
    const parts = f.path.split("/");
    const at = parts.lastIndexOf(seg[f.type]);
    const rest = at >= 0 ? parts.slice(at + 1).join("/") : basename(f.path);
    console.log(`${name}\t${join(dir[f.type], basename(f.path))}\t${join(dir[f.type], rest)}`);
  }
}
