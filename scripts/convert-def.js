#!/usr/bin/env node
/**
 * Convert (def ...) to (def ...) or (def ...) depending on usage
 *
 * Pattern matching:
 * - (def name (params...) body) => (def name (params...) body)
 * - (def name value) => (def name value)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function convertDefInString(code) {
    let result = code;
    let changed = false;

    // Pattern 1: (def name (params...) body) - function definition
    // Look for (def followed by symbol followed by (
    const funcDefPattern = /\(def\s+([a-zA-Z_\-?!*+/<>=][a-zA-Z0-9_\-?!*+/<>=]*)\s+\(/g;
    const funcDefReplacement = '(def $1 (';
    const newResult = result.replace(funcDefPattern, funcDefReplacement);
    if (newResult !== result) {
        changed = true;
        result = newResult;
    }

    // Pattern 2: (def name value) - variable definition
    // This is trickier - we need to NOT match what we just converted
    // Match (def followed by symbol followed by anything that's NOT (
    const varDefPattern = /\(def\s+([a-zA-Z_\-?!*+/<>=][a-zA-Z0-9_\-?!*+/<>=]*)\s+(?!\()/g;
    const varDefReplacement = '(def $1 ';
    const finalResult = result.replace(varDefPattern, varDefReplacement);
    if (finalResult !== result) {
        changed = true;
        result = finalResult;
    }

    return { result, changed };
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { result, changed } = convertDefInString(content);

    if (changed) {
        fs.writeFileSync(filePath, result, 'utf-8');
        return true;
    }
    return false;
}

function walkDir(dir, extensions) {
    const files = fs.readdirSync(dir);
    let changedCount = 0;

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Skip node_modules
            if (file === 'node_modules') continue;
            changedCount += walkDir(filePath, extensions);
        } else if (extensions.some(ext => file.endsWith(ext))) {
            if (processFile(filePath)) {
                console.log(`Updated: ${filePath}`);
                changedCount++;
            }
        }
    }

    return changedCount;
}

// Process all relevant files
const rootDir = path.join(__dirname, '..');
const dirs = ['js/tests', 'tests', 'lib', 't'];
const extensions = ['.js', '.ts', '.sl'];

console.log('Converting (def ...) to (def ...) or (def ...)');
console.log('='.repeat(60));

let totalChanged = 0;
for (const dir of dirs) {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
        console.log(`\nProcessing ${dir}/...`);
        const changed = walkDir(fullPath, extensions);
        totalChanged += changed;
    }
}

console.log('\n' + '='.repeat(60));
console.log(`Total files changed: ${totalChanged}`);
