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

test('Map: create empty map', async () => {
    const code = '(def m (map/create)) (map/size m)';
    assert.strictEqual(await evaluate(code), 0);
});

test('Map: set and get', async () => {
    const code = `
        (def m (map/create))
        (map/set! m "name" "Alice")
        (map/get m "name")
    `;
    assert.strictEqual(await evaluate(code), 'Alice');
});

test('Map: has? check', async () => {
    const code = `
        (def m (map/create))
        (map/set! m "key" "value")
        (map/has? m "key")
    `;
    assert.strictEqual(await evaluate(code), true);

    const code2 = `
        (def m (map/create))
        (map/has? m "missing")
    `;
    assert.strictEqual(await evaluate(code2), false);
});

test('Map: keys and values', async () => {
    const code = `
        (def m (map/create))
        (map/set! m "a" 1)
        (map/set! m "b" 2)
        (map/keys m)
    `;
    const keys = await evaluate(code);
    assert.ok(Array.isArray(keys));
    assert.ok(keys.includes('a'));
    assert.ok(keys.includes('b'));

    const code2 = `
        (def m (map/create))
        (map/set! m "a" 1)
        (map/set! m "b" 2)
        (map/values m)
    `;
    const values = await evaluate(code2);
    assert.ok(Array.isArray(values));
    assert.ok(values.includes(1));
    assert.ok(values.includes(2));
});

test('Map: entries', async () => {
    const code = `
        (def m (map/create))
        (map/set! m "x" 10)
        (map/entries m)
    `;
    const entries = await evaluate(code);
    assert.ok(Array.isArray(entries));
    assert.strictEqual(entries.length, 1);
    assert.deepStrictEqual(entries[0], ['x', 10]);
});

test('Map: size', async () => {
    const code = `
        (def m (map/create))
        (map/set! m "a" 1)
        (map/set! m "b" 2)
        (map/set! m "c" 3)
        (map/size m)
    `;
    assert.strictEqual(await evaluate(code), 3);
});

test('Map: delete!', async () => {
    const code = `
        (def m (map/create))
        (map/set! m "key" "value")
        (map/delete! m "key")
        (map/has? m "key")
    `;
    assert.strictEqual(await evaluate(code), false);
});

test('Map: clear!', async () => {
    const code = `
        (def m (map/create))
        (map/set! m "a" 1)
        (map/set! m "b" 2)
        (map/clear! m)
        (map/size m)
    `;
    assert.strictEqual(await evaluate(code), 0);
});

test('Map: from-list', async () => {
    const code = `
        (def m (map/from-list (list (list "a" 1) (list "b" 2))))
        (map/get m "a")
    `;
    assert.strictEqual(await evaluate(code), 1);
});

test('Map: merge', async () => {
    const code = `
        (def m1 (map/create))
        (map/set! m1 "a" 1)
        (def m2 (map/create))
        (map/set! m2 "b" 2)
        (def m3 (map/merge m1 m2))
        (map/size m3)
    `;
    assert.strictEqual(await evaluate(code), 2);
});
