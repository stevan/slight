import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { Tokenizer } from '../../src/Slight/Tokenizer.js';
import { Parser } from '../../src/Slight/Parser.js';
import { MacroExpander } from '../../src/Slight/MacroExpander.js';
import { Interpreter } from '../../src/Slight/Interpreter.js';

const TEST_DIR = path.join('/tmp', 'slight-test-' + Date.now());

async function evaluate(code: string): Promise<any> {
    async function* stringSource() { yield code; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(stringSource());
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);

    let lastResult: any;
    for await (const result of interpreter.run(expanded)) {
        if (result.value && typeof result.value === 'object' && result.value.type === 'ERROR') {
            throw new Error(`${result.value.stage}: ${result.value.message}`);
        }
        lastResult = result.value;
    }
    return lastResult;
}

test('FS: write and read file', async () => {
    const testDir = path.join('/tmp', 'slight-test-write-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    const testFile = path.join(testDir, 'test.txt');

    const writeCode = `(fs/write! "${testFile}" "Hello, World!")`;
    await evaluate(writeCode);

    const readCode = `(fs/read "${testFile}")`;
    const content = await evaluate(readCode);
    assert.strictEqual(content, 'Hello, World!');

    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
});

test('FS: file exists check', async () => {
    const testDir = path.join('/tmp', 'slight-test-exists-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    const testFile = path.join(testDir, 'exists.txt');

    fs.writeFileSync(testFile, 'test');

    const existsCode = `(fs/exists? "${testFile}")`;
    assert.strictEqual(await evaluate(existsCode), true);

    const notExistsCode = `(fs/exists? "${testFile}.missing")`;
    assert.strictEqual(await evaluate(notExistsCode), false);

    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
});

test('FS: append to file', async () => {
    const testDir = path.join('/tmp', 'slight-test-append-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    const testFile = path.join(testDir, 'append.txt');

    await evaluate(`(fs/write! "${testFile}" "Line 1")`);
    await evaluate(`(fs/append! "${testFile}" " Line 2")`);

    const content = await evaluate(`(fs/read "${testFile}")`);
    assert.strictEqual(content, 'Line 1 Line 2');

    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
});

test('FS: mkdir and readdir', async () => {
    const testDir = path.join('/tmp', 'slight-test-mkdir-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    const subDir = path.join(testDir, 'subdir');

    await evaluate(`(fs/mkdir! "${subDir}" true)`);
    assert.ok(fs.existsSync(subDir));

    // Create some files
    fs.writeFileSync(path.join(subDir, 'file1.txt'), 'test');
    fs.writeFileSync(path.join(subDir, 'file2.txt'), 'test');

    const files = await evaluate(`(fs/readdir "${subDir}")`);
    assert.ok(Array.isArray(files));
    assert.ok(files.includes('file1.txt'));
    assert.ok(files.includes('file2.txt'));

    // Cleanup
    fs.unlinkSync(path.join(subDir, 'file1.txt'));
    fs.unlinkSync(path.join(subDir, 'file2.txt'));
    fs.rmdirSync(subDir);
    fs.rmdirSync(testDir);
});

test('FS: stat file info', async () => {
    const testDir = path.join('/tmp', 'slight-test-stat-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    const testFile = path.join(testDir, 'stat.txt');
    fs.writeFileSync(testFile, 'test content');

    const stat = await evaluate(`(fs/stat "${testFile}")`);
    assert.ok(typeof stat === 'object');
    assert.ok(stat.size > 0);
    assert.strictEqual(stat.isFile, true);
    assert.strictEqual(stat.isDirectory, false);

    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
});
