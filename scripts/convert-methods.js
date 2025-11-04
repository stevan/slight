#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function convertMethodsInString(code) {
    let result = '';
    let i = 0;
    let changed = false;

    while (i < code.length) {
        // Look for "(method "
        if (code.substring(i, i + 8) === '(method ') {
            // Found method definition
            let j = i + 8;

            // Skip whitespace
            while (j < code.length && /\s/.test(code[j])) j++;

            // Extract method name
            const nameStart = j;
            while (j < code.length && /[a-zA-Z0-9_\-?!*+/<>=]/.test(code[j])) j++;
            const methodName = code.substring(nameStart, j);

            // Replace with new syntax
            result += '(:' + methodName + ' ';
            changed = true;
            i = j; // Continue from after method name
        } else {
            result += code[i];
            i++;
        }
    }

    return { result, changed };
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { result, changed } = convertMethodsInString(content);

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

const rootDir = path.join(__dirname, '..');
const dirs = ['js/tests', 'tests', 'lib', 't'];
const extensions = ['.js', '.ts', '.sl'];

console.log('Converting (method name ...) to (:name ...)');
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
