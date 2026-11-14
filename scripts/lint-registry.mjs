// Registry lint (T2 extends): bare registryDependencies are forbidden; every include path exists.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
const root = JSON.parse(readFileSync("registry.json", "utf8"));
const errors = [];
for (const inc of root.include ?? []) {
  if (!existsSync(inc)) { errors.push(`missing include ${inc}`); continue; }
  const reg = JSON.parse(readFileSync(inc, "utf8"));
  for (const item of reg.items ?? []) {
    for (const dep of item.registryDependencies ?? []) {
      if (!dep.startsWith("@yorha/") && !/^https?:\/\//.test(dep)) errors.push(`${item.name}: bare registryDependency "${dep}" (use @yorha/...)`);
    }
    for (const f of item.files ?? []) {
      const p = join(dirname(inc), f.path);
      if (!existsSync(p)) errors.push(`${item.name}: file not found ${p}`);
    }
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`registry lint ok (${(root.include ?? []).length} includes)`);
