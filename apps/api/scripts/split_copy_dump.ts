import fs from "node:fs/promises";
import path from "node:path";

const USAGE = `Usage: ts-node split_copy_dump.ts <input-file> [output-dir]

Splits a pg_dump file that contains multiple COPY blocks (prefaced by
'-- Data for Name: ...') into individual files per table.
`;

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error(USAGE);
    process.exit(1);
  }

  const inputPath = path.resolve(input);
  const outputDir = path.resolve(process.argv[3] ?? path.join(path.dirname(inputPath), "split"));

  const raw = await fs.readFile(inputPath, "utf8");
  const lines = raw.split(/\r?\n/);

  await fs.mkdir(outputDir, { recursive: true });

  interface Section {
    table: string;
    lines: string[];
  }

  const sections: Section[] = [];
  let current: Section | null = null;
  let copyOpen = false;

  const dataHeaderRegex = /^--\s*Data for Name:\s*(\S+);\s*Type:\s*TABLE DATA/i;
  const copyRegex = /^COPY\s+([^\s(]+)\s*\(/i;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const headerMatch = line.match(dataHeaderRegex);
    if (headerMatch) {
      if (current && copyOpen) {
        throw new Error(`Unexpected header while COPY still open for table ${current.table}`);
      }
      current = {
        table: headerMatch[1],
        lines: [line],
      };
      copyOpen = false;
      // capture possible blank/comment lines immediately following the header
      continue;
    }

    if (!current) {
      continue;
    }

    current.lines.push(line);

    if (!copyOpen) {
      const copyMatch = line.match(copyRegex);
      if (copyMatch) {
        copyOpen = true;
      }
      continue;
    }

    if (line.trim() === "\\.") {
      sections.push(current);
      current = null;
      copyOpen = false;
    }
  }

  if (current || copyOpen) {
    throw new Error("Input ended while a COPY block was still open. Ensure the dump file is complete.");
  }

  const fileCounts = new Map<string, number>();

  await Promise.all(
    sections.map(async ({ table, lines: sectionLines }) => {
      const baseName = table.replace(/[^A-Za-z0-9_]+/g, "_");
      const count = (fileCounts.get(baseName) ?? 0) + 1;
      fileCounts.set(baseName, count);

      const fileName = count === 1 ? `${baseName}.sql` : `${baseName}-${count}.sql`;
      const filePath = path.join(outputDir, fileName);
      const content = `${sectionLines.join("\n")}\n`;

      await fs.writeFile(filePath, content, "utf8");
      console.log(`Wrote ${filePath}`);
    }),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

