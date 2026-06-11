#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {importCssFromString} from './run-import.mjs';

function parseArgs(argv) {
  const args = {frameIndex: 1};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--frame' && argv[i + 1]) {
      args.frameIndex = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--project' && argv[i + 1]) {
      args.project = argv[i + 1];
      i += 1;
    } else if (!args.input) {
      args.input = argv[i];
    }
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.input) {
  console.error('Использование: npm run import:css -- <file.css> [--frame 1] [--project am-news]');
  process.exit(1);
}

const cssPath = path.resolve(process.cwd(), args.input);
const css = await readFile(cssPath, 'utf8');

console.log(`Импорт CSS: ${cssPath}`);
const result = await importCssFromString(css, {
  frameIndex: args.frameIndex,
  project: args.project,
});

console.log(
  `Кадр: post ${result.frameId}, family: ${result.family}, слоёв: ${result.layerCount}, фото: ${result.imageCount}`,
);
console.log(`\nСоздан шаблон: src/templates/${result.dirName}/`);
console.log(`Composition id: ${result.compositionId}`);
console.log(`Галерея обновлена: ${result.templateCount} шаблонов`);
console.log('\nПерезапустите галерею: npm run restart');
