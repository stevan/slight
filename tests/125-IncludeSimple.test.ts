import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
        lastResult = result.value;
    }
    return lastResult;
}

test('Include: basic file inclusion works', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slight-include-'));
    const utilFile = path.join(tmpDir, 'util.sl');

    // Create a simple utility file
    fs.writeFileSync(utilFile, '(defun util/add (a b) (+ a b))');

    // Include it and use the function
    const code = `
        (include "${utilFile}")
        (util/add 10 20)
    `;

    const result = await evaluate(code);
    assert.strictEqual(result, 30);

    // Cleanup
    fs.unlinkSync(utilFile);
    fs.rmdirSync(tmpDir);
});

test('Include: error on non-existent file', async () => {
    const result = await evaluate('(include "/nonexistent/file.sl")');
    // Include errors are returned as error objects with type 'ERROR'
    assert.ok(result && typeof result === 'object');
    assert.strictEqual(result.type, 'ERROR');
    assert.match(result.message, /File not found/);
});

test('Include: multiple definitions in one file', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slight-include-'));
    const mathFile = path.join(tmpDir, 'math.sl');

    fs.writeFileSync(mathFile, `
        (defun mymath/double (x) (* x 2))
        (defun mymath/triple (x) (* x 3))
        (defun mymath/square (x) (* x x))
    `);

    const code = `
        (include "${mathFile}")
        (list (mymath/double 5) (mymath/triple 5) (mymath/square 5))
    `;

    const result = await evaluate(code);
    assert.deepStrictEqual(result, [10, 15, 25]);

    // Cleanup
    fs.unlinkSync(mathFile);
    fs.rmdirSync(tmpDir);
});
