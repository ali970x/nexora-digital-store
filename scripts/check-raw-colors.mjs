import {readdir, readFile, stat} from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve('src');
const rawHexPattern = /#[\da-fA-F]{3,8}\b/g;
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const violations = [];

async function inspect(entryPath) {
  const entry = await stat(entryPath);
  if (entry.isDirectory()) {
    const children = await readdir(entryPath);
    await Promise.all(children.map((child) => inspect(path.join(entryPath, child))));
    return;
  }

  if (!sourceExtensions.has(path.extname(entryPath))) return;
  const content = await readFile(entryPath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const matches = line.match(rawHexPattern);
    if (matches)
      violations.push(
        `${path.relative(process.cwd(), entryPath)}:${index + 1} ${matches.join(', ')}`
      );
  });
}

await inspect(sourceRoot);

if (violations.length > 0) {
  console.error('Raw hex colors are forbidden in src/. Use a design token instead.');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log('Color token gate passed: no raw hex values in src/.');
