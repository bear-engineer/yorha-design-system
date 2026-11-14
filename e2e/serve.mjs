// Static server for public/r. Usage: node e2e/serve.mjs <dir> <portfile>
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "public");
const portFile = process.argv[3];
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  const file = join(root, path);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": file.endsWith(".json") ? "application/json" : "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});
server.listen(0, "127.0.0.1", async () => {
  const { port } = server.address();
  if (portFile) await writeFile(portFile, String(port));
  console.log(`serving ${root} on http://127.0.0.1:${port}`);
});
