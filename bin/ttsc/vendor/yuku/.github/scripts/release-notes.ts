import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");

const tag = process.argv[2];
if (tag === undefined || !tag.startsWith("v")) {
  console.error("usage: bun .github/scripts/release-notes.ts v<version>");
  process.exit(1);
}

const heading = `## ${tag.slice(1)}`;
const lines = readFileSync(join(root, "CHANGELOG.md"), "utf8").split("\n");

const start = lines.indexOf(heading);
if (start === -1) {
  console.error(`CHANGELOG.md has no "${heading}" section, write the notes for ${tag} first`);
  process.exit(1);
}
if (lines.lastIndexOf(heading) !== start) {
  console.error(`CHANGELOG.md has more than one "${heading}" section`);
  process.exit(1);
}

const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
const notes = lines
  .slice(start + 1, end === -1 ? lines.length : end)
  .join("\n")
  .trim();
if (notes === "") {
  console.error(`the "${heading}" section of CHANGELOG.md is empty`);
  process.exit(1);
}

console.log(notes);
