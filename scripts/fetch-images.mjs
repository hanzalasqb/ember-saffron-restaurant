// Syncs demo photos (free Unsplash License) with scripts/images.json:
// downloads new/changed photos, removes ones no longer listed. Runs in GitHub Actions before the demo build;
// results are committed so local builds have the same images.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const manifest = JSON.parse(readFileSync(new URL("./images.json", import.meta.url), "utf8"));
const lockFile = "scripts/images.lock.json";
const lock = existsSync(lockFile) ? JSON.parse(readFileSync(lockFile, "utf8")) : {};
let downloaded = 0, removed = 0;

for (const { file, url } of manifest) {
  if (existsSync(file) && lock[file] === url) continue;
  const res = await fetch(url, { headers: { "User-Agent": "github-actions-demo-build" } });
  if (!res.ok) { console.warn(`skip ${file}: HTTP ${res.status}`); continue; }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  lock[file] = url;
  downloaded++;
}
const wanted = new Set(manifest.map((m) => m.file));
for (const dir of new Set(manifest.map((m) => dirname(m.file)))) {
  for (const name of existsSync(dir) ? readdirSync(dir) : []) {
    const file = join(dir, name);
    if (!wanted.has(file)) { rmSync(file); delete lock[file]; removed++; }
  }
}
writeFileSync(lockFile, JSON.stringify(lock, null, 1) + "\n");
console.log(`images: ${downloaded} downloaded, ${removed} removed, ${manifest.length} total`);
