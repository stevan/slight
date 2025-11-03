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

test('Type: of for numbers', async () => {
    assert.strictEqual(await evaluate('(type/of 42)'), 'NUMBER');
    assert.strictEqual(await evaluate('(type/of -17)'), 'NUMBER');
    assert.strictEqual(await evaluate('(type/of 3.14)'), 'NUMBER');
});

test('Type: of for strings', async () => {
    assert.strictEqual(await evaluate('(type/of "hello")'), 'STRING');
    assert.strictEqual(await evaluate('(type/of "")'), 'STRING');
});

test('Type: of for booleans', async () => {
    assert.strictEqual(await evaluate('(type/of true)'), 'BOOLEAN');
    assert.strictEqual(await evaluate('(type/of false)'), 'BOOLEAN');
});

test('Type: of for lists', async () => {
    assert.strictEqual(await evaluate('(type/of (list 1 2 3))'), 'LIST');
    assert.strictEqual(await evaluate('(type/of (list))'), 'NIL'); // empty list is NIL
});

test('Type: of for functions', async () => {
    assert.strictEqual(await evaluate('(type/of +)'), 'FUNCTION');
    const code = '(defun foo (x) x) (type/of foo)';
    assert.strictEqual(await evaluate(code), 'FUNCTION');
});

test('Type: is? check', async () => {
    assert.strictEqual(await evaluate('(type/is? 42 "NUMBER")'), true);
    assert.strictEqual(await evaluate('(type/is? "hi" "STRING")'), true);
    assert.strictEqual(await evaluate('(type/is? 42 "STRING")'), false);
    assert.strictEqual(await evaluate('(type/is? true "BOOLEAN")'), true);
    assert.strictEqual(await evaluate('(type/is? (list 1) "LIST")'), true);
});

test('Type: assert success', async () => {
    const result = await evaluate('(type/assert 42 "NUMBER")');
    assert.strictEqual(result, 42); // returns the value on success
});

test('Type: assert failure throws', async () => {
    try {
        await evaluate('(type/assert "hello" "NUMBER")');
        assert.fail('Should have thrown an error');
    } catch (err: any) {
        assert.ok(err.message.includes('Type assertion failed'));
    }
});
