#!/usr/bin/env node
/** Source/build validation without dependencies; does not pretend to execute WGSL. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
function check(name, fn) {
  try {
    if (fn() === false) throw new Error('Check returned false');
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: String(error.message || error) });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const full = join(path, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}
const jsFiles = files(join(root, 'src')).filter(path => path.endsWith('.js'));
for (const path of jsFiles) {
  check(`JavaScript parses: ${path.slice(root.length + 1)}`, () => {
    new Script(readFileSync(path, 'utf8'), { filename: path });
  });
}
const html = readFileSync(join(root, 'dist/duo-studio.html'), 'utf8');
const manifest = JSON.parse(readFileSync(join(root, 'dist/build-manifest.json'), 'utf8'));
check('Exactly twenty app modules', () => jsFiles.filter(path => path.includes('/apps/')).length === 20);
check('No unresolved template placeholders', () => !/\/\*__(STYLES|SCRIPTS)__\*\//.test(html.replace(/<script>[\s\S]*<\/script>/gi,'')));
check('No external script or stylesheet dependencies', () => !/<script\b[^>]*\bsrc\s*=|<link\b[^>]*\brel\s*=\s*["']stylesheet/i.test(html));
check('Nine inline media assets', () => Object.keys(manifest.assets).length === 9);
check('Six included JPEG compositions', () => Object.keys(manifest.assets).filter(x => x.endsWith('.jpg')).length === 6);
check('Three included MP4 films', () => Object.keys(manifest.assets).filter(x => x.endsWith('.mp4')).length === 3);
check('Manifest SHA-256 matches HTML', () => createHash('sha256').update(html).digest('hex') === manifest.sha256);
check('Manifest byte count matches HTML', () => Buffer.byteLength(html) === manifest.htmlBytes);
check('Single-file script parses after embedding', () => {
  const script = /<script>([\s\S]*)<\/script>/i.exec(html);
  if (!script) throw new Error('Inline script not found');
  new Script(script[1], { filename: 'duo-studio.html:inline' });
});
check('WGSL compute and presentation entry points are present', () => {
  const gpu = readFileSync(join(root, 'src/gpu.js'), 'utf8');
  return ['@compute @workgroup_size(8,8)', 'texture_storage_2d<rgba8unorm, write>', '@vertex fn vs', '@fragment fn fs'].every(x => gpu.includes(x));
});
const report = {
  passed: results.filter(x => x.passed).length,
  failed: results.filter(x => !x.passed).length,
  results,
  boundary: 'Syntax and build checks only. WGSL presence checks do not prove shader compilation or GPU execution.'
};
writeFileSync(join(root, 'tests/static-report.json'), JSON.stringify(report, null, 2) + '\n');
process.exitCode = report.failed ? 1 : 0;
