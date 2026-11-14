// Prints the files shadcn must place for each built item (relative to the fixture root).
// Usage: node e2e/expected-files.mjs <public/r dir> [item...]   (no items = every item in registry/items.json)
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const itemsJson = fileURLToPath(new URL("../registry/items.json", import.meta.url));

const [rDir, ...names] = process.argv.slice(2);
const items = names.length ? names : JSON.parse(readFileSync(itemsJson, "utf8")).map((i) => i.name);
const dir = { "registry:ui": "app/components/ui", "registry:lib": "app/lib", "registry:hook": "app/hooks", "registry:component": "app/components" };
// Output: item <TAB> documented flat path (what `@/components/ui/<name>`, `@/lib/<name>` etc. resolve to).
// Strict: shadcn must place every file exactly there; no tolerance for nested placements.
for (const name of items) {
  const item = JSON.parse(readFileSync(join(rDir, `${name}.json`), "utf8"));
  for (const f of item.files ?? []) {
    if (f.target) {
      console.log(`${name}\t${f.target}`);
      continue;
    }
    if (!dir[f.type]) { console.error(`cannot place ${name}: ${f.path} (${f.type})`); process.exit(2); }
    console.log(`${name}\t${join(dir[f.type], basename(f.path))}`);
  }
}
