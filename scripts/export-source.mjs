// Regenerate a copy-friendly reference without including secrets or artifacts.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const languages = { '.html': 'html', '.css': 'css', '.js': 'javascript', '.mjs': 'javascript', '.json': 'json', '.svg': 'xml', '.md': 'markdown' };
const textExtensions = new Set([...Object.keys(languages), '.txt']);
const roots = ['index.html', 'css', 'js', 'assets', 'server', 'tests', 'scripts', 'package.json', '.env.example', '.gitignore', 'README.md'];

async function collect(relative) {
  if (path.extname(relative) || relative === '.gitignore') return [relative];
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await collect(child));
    else if (textExtensions.has(path.extname(entry.name))) result.push(child);
  }
  return result;
}

const data = JSON.parse(await readFile(path.join(root, 'assets/data/tarot-images.json'), 'utf8'));
await writeFile(path.join(root, 'assets/images/tarot/filenames.txt'), `${data.cards.map((card) => card.img).join('\n')}\n`);
const files = (await Promise.all(roots.map(collect))).flat();
const sections = ['# Duang Pang — exact source files\n\nCreate each relative path shown below and copy its code block into that file. This reference is generated from the actual project files. The original 78-card JSON is included. The 78 supplied JPG scans are provided separately in `assets/images/tarot/` in the project ZIP; binary images are not embedded in these code blocks.\n'];
for (const filename of files) {
  const language = languages[path.extname(filename)] || (filename === '.env.example' ? 'dotenv' : 'text');
  const source = await readFile(path.join(root, filename), 'utf8');
  sections.push(`\n## ${filename}\n\n\`\`\`\`${language}\n${source}${source.endsWith('\n') ? '' : '\n'}\`\`\`\`\n`);
}
await writeFile(path.join(root, 'SOURCE_CODE.md'), sections.join(''));
console.log(`Exported ${files.length} files to SOURCE_CODE.md.`);
