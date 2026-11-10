#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

let packageManager = 'npm';
try {
  execSync('bun --version', { stdio: 'ignore' });
  packageManager = 'bun';
  console.log('Bun detected, using it for setup...');
} catch {
  console.log('Bun not found, using npm instead...');
}

console.log('Installing dependencies...');
execSync(`${packageManager} install`, { stdio: 'inherit', cwd: rootDir });

console.log('Configuring for Claude Desktop...');
execSync(`node ${path.join(__dirname, 'configure-claude.js')}`, { stdio: 'inherit', cwd: rootDir });

console.log('\nConfiguration completed.');
console.log('To use the MCP, make sure to start the WebSocket server:');
if (packageManager === 'bun') {
  console.log('  bun socket');
} else {
  console.log('  npm run socket');
}
