// Regenerate tsconfig.json compilerOptions.paths from registry/items.json (SOT for item aliases).
import { readFileSync, writeFileSync } from "node:fs";
const items = JSON.parse(readFileSync("registry/items.json", "utf8"));
const ts = JSON.parse(readFileSync("tsconfig.json", "utf8"));
const paths = {};
for (const it of items) if (it.alias) paths[it.alias] = [`./registry/yorha/${it.group}/${it.name}/${it.file}`];
ts.compilerOptions.paths = paths;
writeFileSync("tsconfig.json", JSON.stringify(ts, null, 2) + "\n");
console.log(`paths: ${Object.keys(paths).length}`);
