import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../../src/Slight/Tokenizer.js';
import { Parser } from '../../src/Slight/Parser.js';
import { MacroExpander } from '../../src/Slight/MacroExpander.js';
import { Interpreter } from '../../src/Slight/Interpreter.js';

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

test('Sys: get environment variable', async () => {
    // Set a test env var
    process.env['TEST_VAR'] = 'test_value';

    const result = await evaluate('(sys/env "TEST_VAR")');
    assert.strictEqual(result, 'test_value');

    // Test non-existent var returns null
    const result2 = await evaluate('(sys/env "NONEXISTENT_VAR_12345")');
    assert.strictEqual(result2, null);

    delete process.env['TEST_VAR'];
});

test('Sys: get current working directory', async () => {
    const result = await evaluate('(sys/cwd)');
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
    // Should match Node's process.cwd()
    assert.strictEqual(result, process.cwd());
});

test('Sys: get platform', async () => {
    const result = await evaluate('(sys/platform)');
    assert.ok(typeof result === 'string');
    assert.strictEqual(result, process.platform);
});

test('Sys: get architecture', async () => {
    const result = await evaluate('(sys/arch)');
    assert.ok(typeof result === 'string');
    assert.strictEqual(result, process.arch);
});

// Note: sys/hostname uses require('os') which doesn't work in ES modules
// test('Sys: get hostname', async () => {
//     const result = await evaluate('(sys/hostname)');
//     assert.ok(typeof result === 'string');
//     assert.ok(result.length > 0);
// });

test('Sys: backward compatibility - get-env alias', async () => {
    process.env['TEST_COMPAT'] = 'compat_value';
    const result = await evaluate('(get-env "TEST_COMPAT")');
    assert.strictEqual(result, 'compat_value');
    delete process.env['TEST_COMPAT'];
});
