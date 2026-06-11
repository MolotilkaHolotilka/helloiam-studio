#!/usr/bin/env node
import {execSync} from 'node:child_process';

const ports = process.argv.slice(2).map(Number).filter(Boolean);

function run(cmd) {
  try {
    execSync(cmd, {stdio: 'ignore', shell: true});
  } catch {
    // ignore
  }
}

for (const port of ports) {
  run(`lsof -ti:${port} | xargs kill -9 2>/dev/null`);
}

// Старые Remotion Studio из helloiam-remotion и studio
run(`pkill -f "preview-gallery.mjs" 2>/dev/null`);

for (const port of ports) {
  try {
    const out = execSync(`lsof -ti:${port} 2>/dev/null`, {encoding: 'utf8'}).trim();
    if (!out) {
      console.log(`Порт ${port} свободен`);
    }
  } catch {
    console.log(`Порт ${port} свободен`);
  }
}
