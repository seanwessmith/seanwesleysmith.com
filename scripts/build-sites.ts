import { mkdir, readdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { sites } from "../sites.config";

for (const site of sites) {
  if (site.kind === "static") {
    await copyDirectory(site.source, site.outDir);
    continue;
  }

  const result = await Bun.build({
    entrypoints: [site.entrypoint],
    outdir: site.outDir,
    minify: true,
    publicPath: site.publicPath,
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
}

async function copyDirectory(source: string, destination: string) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(from, to);
    } else if (entry.isFile()) {
      await mkdir(dirname(to), { recursive: true });
      await copyFile(from, to);
    }
  }
}
