#!/usr/bin/env node
/*
 Simple file size guardrail: fails if any src/**/*.js exceeds 500 lines.
 Exits with code 1 on violation and prints offending files.
*/
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const LIMIT = parseInt(process.env.FILE_LINE_LIMIT || '500', 10);

/** @param {string} dir */
function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && p.endsWith('.js')) yield p;
  }
}

if (!fs.existsSync(SRC_DIR)) {
  console.error('No src/ directory found. Exiting.');
  process.exit(0);
}

const offenders = [];
for (const file of walk(SRC_DIR)) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/).length;
  if (lines > LIMIT) offenders.push({ file, lines });
}

if (offenders.length) {
  console.error(`File size limit exceeded (${LIMIT} lines):`);
  for (const o of offenders.sort((a,b) => b.lines - a.lines)) {
    console.error(`- ${path.relative(ROOT, o.file)}: ${o.lines}`);
  }
  process.exit(1);
} else {
  console.log('All JS files are within the line limit.');
}

