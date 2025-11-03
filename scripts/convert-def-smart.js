#!/usr/bin/env node
/**
 * Smarter conversion using actual parsing logic
 * Convert (def ...) to (def ...) or (def ...) based on structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function convertDefInString(code) {
    let result = '';
    let i = 0;
    let changed = false;

    while (i < code.length) {
        // Look for "(def "
        if (code.substring(i, i + 5) === '(def ') {
            // Found def, now analyze what comes after
            let j = i + 5;

            // Skip whitespace and get the name
            while (j < code.length && /\s/.test(code[j])) j++;
            const nameStart = j;
            while (j < code.length && /[a-zA-Z0-9_\-?!*+/<>=]/.test(code[j])) j++;
            const name = code.substring(nameStart, j);

            // Skip whitespace
            while (j < code.length && /\s/.test(code[j])) j++;

            // Check what comes next
            if (code[j] === '(') {
                // Could be function def or var def with function call
                // We need to check if this looks like a parameter list
                const nextChar = j + 1;
                let k = nextChar;

                // Skip whitespace
                while (k < code.length && /\s/.test(code[k])) k++;

                // Check if it's a parameter list or function call
                // Parameter list starts with: symbol, ".", or ")"
                // Function call starts with: symbol followed by more complex stuff

                let isParamList = false;

                if (code[k] === ')') {
                    // Empty param list: ()
                    isParamList = true;
                } else if (code[k] === '.') {
                    // Variadic param list starts with dot: (. rest)
                    isParamList = true;
                } else if (/[a-zA-Z_\-?!*+/<>=]/.test(code[k])) {
                    // Starts with a symbol, need to check what follows
                    let symbolStart = k;
                    while (k < code.length && /[a-zA-Z0-9_\-?!*+/<>=]/.test(code[k])) k++;

                    // Skip whitespace after first symbol
                    while (k < code.length && /\s/.test(code[k])) k++;

                    // Check what follows the symbol
                    if (code[k] === ')' || code[k] === '.' || /[a-zA-Z_\-?!*+/<>=]/.test(code[k])) {
                        // Followed by: ), another symbol, or dot → likely param list
                        isParamList = true;
                    } else {
                        // Followed by: (, string, number → likely function call
                        isParamList = false;
                    }
                }

                if (isParamList) {
                    result += '(defun ' + name + ' ';
                    changed = true;
                    i = j; // Continue from opening paren
                } else {
                    result += '(defvar ' + name + ' ';
                    changed = true;
                    i = j; // Continue from opening paren
                }
            } else {
                // Not followed by '(' - must be variable definition
                result += '(defvar ' + name + ' ';
                changed = true;
                i = j; // Continue from current position
            }
        } else {
            result += code[i];
            i++;
        }
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

console.log('Re-converting with smarter logic...');
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
