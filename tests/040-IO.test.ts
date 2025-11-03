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

describe('I/O Functions', () => {
    test('print outputs to STDOUT without newline', async () => {
        const results = await runCode('(print "Hello" "World")');

        // Should have 2 tokens: one from print output, one from the return value
        assert.strictEqual(results.length, 2);

        // First token should be the print output
        assert.strictEqual(results[0].type, OutputHandle.STDOUT);
        assert.strictEqual(results[0].value, 'Hello World');

        // Second token should be the return value (null -> ()) as INFO
        assert.strictEqual(results[1].type, OutputHandle.INFO);
        assert.strictEqual(results[1].value, null);
    });

    test('say outputs to STDOUT with newline', async () => {
        const results = await runCode('(say "Hello" "World")');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].type, OutputHandle.STDOUT);
        assert.strictEqual(results[0].value, 'Hello World\n');
        assert.strictEqual(results[1].value, null);
    });

    test('warn outputs to WARN with newline', async () => {
        const results = await runCode('(warn "This is a warning")');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].type, OutputHandle.WARN);
        assert.strictEqual(results[0].value, 'This is a warning\n');
        assert.strictEqual(results[1].value, null);
    });

    test('print formats different types correctly', async () => {
        const results = await runCode('(print 42 true (list 1 2 3))');

        assert.strictEqual(results[0].type, OutputHandle.STDOUT);
        assert.strictEqual(results[0].value, '42 true (1 2 3)');
    });

    test('multiple print calls in sequence', async () => {
        const results = await runCode('(begin (print "A") (print "B") (say "C"))');

        // Should have 4 tokens: 3 print outputs + 1 return value
        assert.strictEqual(results.length, 4);

        assert.strictEqual(results[0].type, OutputHandle.STDOUT);
        assert.strictEqual(results[0].value, 'A');

        assert.strictEqual(results[1].type, OutputHandle.STDOUT);
        assert.strictEqual(results[1].value, 'B');

        assert.strictEqual(results[2].type, OutputHandle.STDOUT);
        assert.strictEqual(results[2].value, 'C\n');

        // begin returns the last expression's value
        assert.strictEqual(results[3].value, null);
    });

    test('print/say/warn work in functions', async () => {
        const code = `
            (def greet (name)
                (begin
                    (say "Hello" name)
                    (warn "Greeting complete")
                    "done"))
            (greet "Alice")
        `;

        const results = await runCode(code);

        // Should have: INFO (def), say output, warn output, return value (greet)
        assert.ok(results.length >= 3);

        // Find the say output
        const sayOutput = results.find(r => r.type === OutputHandle.STDOUT && typeof r.value === 'string' && r.value.includes('Hello'));
        assert.ok(sayOutput);
        assert.strictEqual(sayOutput.value, 'Hello Alice\n');

        // Find the warn output
        const warnOutput = results.find(r => r.type === OutputHandle.WARN);
        assert.ok(warnOutput);
        assert.strictEqual(warnOutput.value, 'Greeting complete\n');

        // Find the final return value
        const returnValue = results[results.length - 1];
        assert.strictEqual(returnValue.value, 'done');
    });

    test('print handles empty arguments', async () => {
        const results = await runCode('(print)');

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].type, OutputHandle.STDOUT);
        assert.strictEqual(results[0].value, '');
    });

    test('print with null values', async () => {
        const results = await runCode('(print (list))');

        assert.strictEqual(results[0].type, OutputHandle.STDOUT);
        assert.strictEqual(results[0].value, '()');
    });
});
