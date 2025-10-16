import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import * as fs from 'fs';
import * as path from 'path';

// Helper to create an async generator from strings
async function* mockAsyncGen(items: string[]) {
    for (const i of items) yield i;
}

// Helper to run Slight code and get results
async function runSlight(code: string, interpreter: Interpreter) {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const tokens = tokenizer.run(mockAsyncGen([code]));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) {
        results.push(result);
    }
    return results;
}

const fixturesPath = path.resolve('tests/fixtures');

test('include resolves files relative to current file', async () => {
    const interpreter = new Interpreter();
    const mainFile = path.join(fixturesPath, 'examples/relative-include.sl');

    interpreter.setCurrentFile(mainFile);

    const input = fs.readFileSync(mainFile, 'utf8');
    const results = await runSlight(input, interpreter);

    // Filter out null and true (from def) results
    const finalResults = results.filter(r => r.value !== null && r.value !== true);
    assert.strictEqual(finalResults.length, 1);
    assert.deepStrictEqual(finalResults[0].value, ["Hello, ", "World", "!"]);
});

test('include resolves files from include paths', async () => {
    const interpreter = new Interpreter();
    const mainFile = path.join(fixturesPath, 'examples/use-math.sl');

    // Set include paths to find math.sl in lib directory
    interpreter.setIncludePaths([path.join(fixturesPath, 'lib')]);
    interpreter.setCurrentFile(mainFile);

    const input = fs.readFileSync(mainFile, 'utf8');
    const results = await runSlight(input, interpreter);

    // Filter out null and true results
    const finalResults = results.filter(r => r.value !== null && r.value !== true);
    assert.strictEqual(finalResults.length, 1);
    // Should return list with pi, square(5)=25, area-of-circle(3)
    const [pi, square25, area] = finalResults[0].value;
    assert.strictEqual(pi, 3.14159);
    assert.strictEqual(square25, 25);
    assert.strictEqual(area, 3.14159 * 9); // pi * r^2
});

test('include fails when file not found', async () => {
    const interpreter = new Interpreter();
    const results = await runSlight('(include "non-existent-file.sl")', interpreter);

    // Should have an error (OutputHandle.ERROR = '💔')
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].type, '💔');
    assert.match(results[0].value.message, /File not found/);
});

test('include detects circular dependencies', async () => {
    const interpreter = new Interpreter();
    const file1 = path.join(fixturesPath, 'circular/file1.sl');

    interpreter.setCurrentFile(file1);

    const input = fs.readFileSync(file1, 'utf8');
    const results = await runSlight(input, interpreter);

    // Should have an error for circular dependency
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].type, '💔');
    assert.match(results[0].value.message, /Circular dependency detected/);
});

test('include with namespace conventions', async () => {
    const interpreter = new Interpreter();
    const code = '(include "math.sl") (list (math/pi) (math/square 5) (math/tau))';

    // Set include path to lib directory
    interpreter.setIncludePaths([path.join(fixturesPath, 'lib')]);

    const results = await runSlight(code, interpreter);

    // Filter out null results from definitions
    const nonNullResults = results.filter(r => r.value !== null && r.value !== true);
    assert.strictEqual(nonNullResults.length, 1);
    const [pi, square25, tau] = nonNullResults[0].value;
    assert.strictEqual(pi, 3.14159);
    assert.strictEqual(square25, 25);
    assert.strictEqual(tau, 6.28318); // 2 * pi
});

test('include with multiple include paths', async () => {
    const interpreter = new Interpreter();
    const code = '(include "constants.sl") (include "external.sl") (list (version) (external/version))';

    // Set multiple include paths
    interpreter.setIncludePaths([
        path.join(fixturesPath, 'lib'),
        path.join(fixturesPath, 'vendor')
    ]);

    const results = await runSlight(code, interpreter);

    // Filter out null results from definitions
    const nonNullResults = results.filter(r => r.value !== null && r.value !== true);
    assert.strictEqual(nonNullResults.length, 1);
    assert.deepStrictEqual(nonNullResults[0].value, ["1.0.0", "2.0.0"]);
});

test('include preserves global bindings across files', async () => {
    const interpreter = new Interpreter();
    const code = `
        (include "constants.sl")
        (include "math.sl")
        (list (version) (math/pi) (debug-mode))
    `;

    interpreter.setIncludePaths([path.join(fixturesPath, 'lib')]);

    const results = await runSlight(code, interpreter);

    // Filter out null and true results from definitions
    const finalResult = results.filter(r => r.value !== null && r.value !== true);
    assert.strictEqual(finalResult.length, 1);
    assert.deepStrictEqual(finalResult[0].value, ["1.0.0", 3.14159, false]);
});

test('include with FFI operations', async () => {
    const interpreter = new Interpreter();
    const code = `
        (include "data.sl")
        (let ((person (data/create-person "Alice" 30)))
          (list (map-get person "name") (map-get person "age")))
    `;

    interpreter.setIncludePaths([path.join(fixturesPath, 'lib')]);

    const results = await runSlight(code, interpreter);

    // Filter out null and true results
    const finalResult = results.filter(r => r.value !== null && r.value !== true);
    assert.strictEqual(finalResult.length, 1);
    assert.deepStrictEqual(finalResult[0].value, ["Alice", 30]);
});

test('include paths are searched in order', async () => {
    const interpreter = new Interpreter();

    // Create a test scenario where same file exists in different paths
    const libPath = path.join(fixturesPath, 'lib');
    const vendorPath = path.join(fixturesPath, 'vendor');

    // Both directories exist with different files
    // If we include "external.sl", it should only be found in vendor
    interpreter.setIncludePaths([libPath, vendorPath]);

    const code = '(include "external.sl") (external/name)';
    const results = await runSlight(code, interpreter);

    const finalResults = results.filter(r => r.value !== null && r.value !== true);
    assert.strictEqual(finalResults.length, 1);
    assert.strictEqual(finalResults[0].value, "External Library");
});

test('include can handle complex nested includes', async () => {
    const interpreter = new Interpreter();

    // Create a file that includes math which includes constants
    const complexFile = path.join(fixturesPath, 'examples/complex-include.sl');
    fs.writeFileSync(complexFile, `
        (include "string.sl")
        (include "math.sl")
        (string/wrap (math/square 3) "Result: " "!")
    `);

    interpreter.setIncludePaths([path.join(fixturesPath, 'lib')]);
    interpreter.setCurrentFile(complexFile);

    const input = fs.readFileSync(complexFile, 'utf8');
    const results = await runSlight(input, interpreter);

    // Clean up
    fs.unlinkSync(complexFile);

    const finalResults = results.filter(r => r.value !== null && r.value !== true);
    assert.strictEqual(finalResults.length, 1);
    assert.deepStrictEqual(finalResults[0].value, ["Result: ", 9, "!"]);
});

test('include with absolute paths', async () => {
    const interpreter = new Interpreter();
    const absolutePath = path.join(fixturesPath, 'lib/constants.sl');
    const code = `(include "${absolutePath}") (version)`;

    const results = await runSlight(code, interpreter);

    const finalResults = results.filter(r => r.value !== null && r.value !== true);
    assert.strictEqual(finalResults.length, 1);
    assert.strictEqual(finalResults[0].value, "1.0.0");
});

test('included functions can reference other included definitions', async () => {
    const interpreter = new Interpreter();

    // math.sl uses math/pi in its functions
    const code = '(include "math.sl") (math/area-of-circle 2)';

    interpreter.setIncludePaths([path.join(fixturesPath, 'lib')]);

    const results = await runSlight(code, interpreter);

    const finalResults = results.filter(r => r.value !== null && r.value !== true);
    assert.strictEqual(finalResults.length, 1);
    assert.strictEqual(finalResults[0].value, 3.14159 * 4); // pi * r^2
});