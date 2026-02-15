#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';

const REPO_URL = 'https://github.com/arinspunk/claude-talk-to-figma-mcp.git';
const FOLDER_NAME = 'claude-talk-to-figma-mcp';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function checkCommand(cmd) {
    try {
        execSync(`${cmd} --version`, { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

async function installBun() {
    const isWindows = process.platform === 'win32';
    console.log('🚀 Installing Bun...');

    try {
        if (isWindows) {
            execSync('powershell -c "irm bun.sh/install.ps1 | iex"', { stdio: 'inherit' });
        } else {
            execSync('curl -fsSL https://bun.sh/install | bash', { stdio: 'inherit' });
        }
        console.log('✅ Bun installed successfully. You might need to restart your terminal to use it globally.');
        return true;
    } catch (e) {
        console.error('❌ Failed to install Bun auto-magically.');
        return false;
    }
}

async function main() {
    console.log('🎨 Welcome to Claude Talk to Figma MCP Launcher!');

    // Handle optional target directory
    const targetDir = process.argv[2];
    if (targetDir) {
        const absolutePath = path.resolve(targetDir);
        if (fs.existsSync(absolutePath)) {
            const stats = fs.statSync(absolutePath);
            if (!stats.isDirectory()) {
                console.error(`\n❌ Error: ${absolutePath} is not a directory.`);
                process.exit(1);
            }
        } else {
            console.log(`\n📁 Creating directory: ${absolutePath}`);
            fs.mkdirSync(absolutePath, { recursive: true });
        }
        process.chdir(absolutePath);
        console.log(`\n📍 Working directory set to: ${process.cwd()}`);
    }

    let engine = 'bun';
    const hasBun = await checkCommand('bun');

    if (!hasBun) {
        console.log('\n💡 Bun is not detected. Bun is highly recommended for best performance.');
        const answer = await question('❓ Would you like to install Bun now? (y/n): ');

        if (answer.toLowerCase() === 'y') {
            const success = await installBun();
            if (success) {
                // Try to find bun if it was just installed
                const bunPath = path.join(os.homedir(), '.bun', 'bin', 'bun');
                if (fs.existsSync(bunPath)) {
                    engine = bunPath;
                }
            } else {
                console.log('⚠️  Falling back to NPM.');
                engine = 'npm';
            }
        } else {
            console.log('⚠️  Proceeding with NPM.');
            engine = 'npm';
        }
    }

    // 1. Check for repository
    if (!fs.existsSync(FOLDER_NAME)) {
        console.log(`\n📥 Cloning repository from ${REPO_URL}...`);
        execSync(`git clone ${REPO_URL}`, { stdio: 'inherit' });
    }

    process.chdir(FOLDER_NAME);

    // 2. Install dependencies
    console.log(`\n📦 Installing dependencies using ${engine === 'npm' ? 'NPM' : 'Bun'}...`);
    if (engine === 'npm') {
        execSync('npm install', { stdio: 'inherit' });
        console.log('🏗️ Building project (required for NPM execution)...');
        execSync('npm run build', { stdio: 'inherit' });
    } else {
        execSync(`${engine} install`, { stdio: 'inherit' });
        if (!fs.existsSync('dist')) {
            console.log('🏗️ Building project (required for execution)...');
            execSync(`${engine} run build`, { stdio: 'inherit' });
        }
    }

    // 3. Inform about Figma Plugin
    console.log('\n🔌 Reminder: Ensure the Figma plugin is installed!');
    console.log(`   Path to manifest: ${path.resolve('src/claude_mcp_plugin/manifest.json')}`);

    // 4. Start Socket Server
    console.log('\n🚀 Starting Socket Server...');
    const startCmd = engine === 'npm' ? 'node' : engine;
    const startArgs = engine === 'npm' ? ['dist/socket.js'] : ['run', 'socket'];

    const child = spawn(startCmd, startArgs, {
        stdio: 'inherit',
        shell: true
    });

    child.on('exit', (code) => {
        console.log(`\n👋 Socket server exited with code ${code}`);
        process.exit(code);
    });
}

main().catch(err => {
    console.error('\n💥 Launcher error:', err);
    process.exit(1);
});
