import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AliasDictionary } from "../src/engine/normalization";
import { normalizeSiteText } from "../src/engine/normalization";

interface ProjectRow { id: string; name: string }

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputPath = argument("--input") ?? resolve("data/site-aliases.json");
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}
const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};
const dictionary = JSON.parse(await readFile(inputPath, "utf8")) as AliasDictionary;
const projectResponse = await fetch(`${supabaseUrl}/rest/v1/projects?select=id,name`, {
  headers,
  signal: AbortSignal.timeout(20_000),
});
if (!projectResponse.ok) throw new Error(`Could not load projects: ${projectResponse.status}`);
const projects = await projectResponse.json() as ProjectRow[];
const rows = dictionary.clusters.flatMap((cluster) => {
  const clusterNames = [cluster.canonical, ...cluster.aliases].map(normalizeSiteText);
  const matchingProjects = projects.filter((project) => {
    const name = normalizeSiteText(project.name);
    return clusterNames.some((candidate) => name.includes(candidate) || candidate.includes(name));
  });
  return matchingProjects.flatMap((project) => cluster.aliases.map((alias) => ({
    site_id: project.id,
    alias,
    source: `initial:${cluster.type}`,
  })));
});
if (rows.length === 0) {
  process.stdout.write("No matching active project names were found; no aliases inserted.\n");
  process.exit(0);
}
const seedResponse = await fetch(`${supabaseUrl}/rest/v1/site_aliases?on_conflict=site_id,alias`, {
  method: "POST",
  headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=minimal" },
  body: JSON.stringify(rows),
  signal: AbortSignal.timeout(20_000),
});
if (!seedResponse.ok) throw new Error(`Could not seed aliases: ${seedResponse.status} ${(await seedResponse.text()).slice(0, 500)}`);
process.stdout.write(`Seeded ${rows.length} alias mappings across ${new Set(rows.map((row) => row.site_id)).size} projects.\n`);
