import { describe, test } from 'node:test';
import * as assert from 'node:assert';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { OutputHandle, OutputToken } from '../src/Slight/Types.js';

async function runCode(code: string): Promise<OutputToken[]> {
    async function* stringSource() {
        yield code;
    }

    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(stringSource());
    const ast = parser.run(tokens);
    const expanded = macroExpander.run(ast);
    const output = interpreter.run(expanded);

    const results: OutputToken[] = [];
    for await (const token of output) {
        results.push(token);
    }

    return results;
}

describe('Logging Functions', () => {
    test('log/info writes to INFO handle', async () => {
        const results = await runCode('(log/info "Server started")');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].type, OutputHandle.INFO);
        assert.strictEqual(results[0].value, 'Server started\n');
        assert.strictEqual(results[1].value, null);
    });

    test('log/debug writes to DEBUG handle', async () => {
        const results = await runCode('(log/debug "Variable x =" 42)');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].type, OutputHandle.DEBUG);
        assert.strictEqual(results[0].value, 'Variable x = 42\n');
    });

    test('log/warn writes to WARN handle', async () => {
        const results = await runCode('(log/warn "Deprecated function")');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].type, OutputHandle.WARN);
        assert.strictEqual(results[0].value, 'Deprecated function\n');
    });

    test('log/error writes to ERROR handle', async () => {
        const results = await runCode('(log/error "Connection failed")');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].type, OutputHandle.ERROR);
        assert.strictEqual(results[0].value, 'Connection failed\n');
    });

    test('warn is an alias to log/warn', async () => {
        const results = await runCode('(warn "Warning message")');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].type, OutputHandle.WARN);
        assert.strictEqual(results[0].value, 'Warning message\n');
    });

    test('log/disable disables logging', async () => {
        const code = `(begin
            (log/disable)
            (log/info "This should not appear")
            (log/debug "This should not appear")
            (log/warn "This should not appear")
            (log/error "This should not appear")
            42)`;

        const results = await runCode(code);

        // Should only have: INFO (42 from begin)
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].type, OutputHandle.INFO);
        assert.strictEqual(results[0].value, 42);
    });

    test('log/enable re-enables logging', async () => {
        const code = `(begin
            (log/disable)
            (log/info "Should not appear")
            (log/enable)
            (log/info "Should appear")
            42)`;

        const results = await runCode(code);

        // Should have: INFO (log output), STDOUT (42)
        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].type, OutputHandle.INFO);
        assert.strictEqual(results[0].value, 'Should appear\n');
        assert.strictEqual(results[1].value, 42);
    });

    test('warn is disabled when logging is disabled', async () => {
        const code = `(begin
            (log/disable)
            (warn "Should not appear")
            42)`;

        const results = await runCode(code);

        // Should only have: INFO (42)
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].type, OutputHandle.INFO);
        assert.strictEqual(results[0].value, 42);
    });

    test('logging formats different types correctly', async () => {
        const results = await runCode('(log/info 42 true (list 1 2 3))');

        assert.strictEqual(results[0].type, OutputHandle.INFO);
        assert.strictEqual(results[0].value, '42 true (1 2 3)\n');
    });

    test('multiple log calls in sequence', async () => {
        const code = `(begin
            (log/info "Info")
            (log/debug "Debug")
            (log/warn "Warn")
            (log/error "Error"))`;

        const results = await runCode(code);

        assert.strictEqual(results.length, 5);  // 4 logs + 1 return
        assert.strictEqual(results[0].type, OutputHandle.INFO);
        assert.strictEqual(results[0].value, 'Info\n');
        assert.strictEqual(results[1].type, OutputHandle.DEBUG);
        assert.strictEqual(results[1].value, 'Debug\n');
        assert.strictEqual(results[2].type, OutputHandle.WARN);
        assert.strictEqual(results[2].value, 'Warn\n');
        assert.strictEqual(results[3].type, OutputHandle.ERROR);
        assert.strictEqual(results[3].value, 'Error\n');
        assert.strictEqual(results[4].value, null);
    });

    test('logging works in functions', async () => {
        const code = `(def process (x)
            (begin
                (log/debug "Processing" x)
                (log/info "Result:" (* x 2))
                (* x 2)))
        (process 21)`;

        const results = await runCode(code);

        // Find the debug and info outputs
        const debugOutput = results.find(r => r.type === OutputHandle.DEBUG);
        assert.ok(debugOutput);
        assert.strictEqual(debugOutput.value, 'Processing 21\n');

        const infoOutput = results.find(r => r.type === OutputHandle.INFO && typeof r.value === 'string' && r.value.includes('Result'));
        assert.ok(infoOutput);
        assert.strictEqual(infoOutput.value, 'Result: 42\n');

        // Final return value
        const returnValue = results[results.length - 1];
        assert.strictEqual(returnValue.value, 42);
    });

    test('log functions handle empty arguments', async () => {
        const results = await runCode('(log/info)');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].type, OutputHandle.INFO);
        assert.strictEqual(results[0].value, '\n');
    });

    test('logging is enabled by default', async () => {
        const results = await runCode('(log/info "Default enabled")');

        const infoOutput = results.find(r => r.type === OutputHandle.INFO);
        assert.ok(infoOutput);
        assert.strictEqual(infoOutput.value, 'Default enabled\n');
    });
});
