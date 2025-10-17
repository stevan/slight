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
        // Skip error results and get the actual value
        if (result.value && typeof result.value === 'object' && result.value.type === 'ERROR') {
            throw new Error(`${result.value.stage}: ${result.value.message}`);
        }
        lastResult = result.value;
    }
    return lastResult;
}

test('List: create list', async () => {
    assert.deepStrictEqual(await evaluate('(list/create 1 2 3)'), [1, 2, 3]);
    assert.deepStrictEqual(await evaluate('(list 1 2 3)'), [1, 2, 3]); // alias
    assert.deepStrictEqual(await evaluate('(list/create)'), []);
});

test('List: head and tail', async () => {
    assert.strictEqual(await evaluate('(list/head (list 1 2 3))'), 1);
    assert.strictEqual(await evaluate('(head (list 1 2 3))'), 1); // alias
    assert.deepStrictEqual(await evaluate('(list/tail (list 1 2 3))'), [2, 3]);
    assert.deepStrictEqual(await evaluate('(tail (list 1 2 3))'), [2, 3]); // alias
});

test('List: cons', async () => {
    assert.deepStrictEqual(await evaluate('(list/cons 0 (list 1 2))'), [0, 1, 2]);
    assert.deepStrictEqual(await evaluate('(cons 0 (list 1 2))'), [0, 1, 2]); // alias
});

test('List: nth element', async () => {
    assert.strictEqual(await evaluate('(list/nth (list "a" "b" "c") 0)'), 'a');
    assert.strictEqual(await evaluate('(list/nth (list "a" "b" "c") 1)'), 'b');
    assert.strictEqual(await evaluate('(list/nth (list "a" "b" "c") 2)'), 'c');
});

test('List: length and empty?', async () => {
    assert.strictEqual(await evaluate('(list/length (list 1 2 3))'), 3);
    assert.strictEqual(await evaluate('(list/length (list))'), 0);
    assert.strictEqual(await evaluate('(list/empty? (list))'), true);
    assert.strictEqual(await evaluate('(empty? (list))'), true); // alias
    assert.strictEqual(await evaluate('(list/empty? (list 1))'), false);
});

test('List: reverse', async () => {
    assert.deepStrictEqual(await evaluate('(list/reverse (list 1 2 3))'), [3, 2, 1]);
    assert.deepStrictEqual(await evaluate('(list/reverse (list "a" "b"))'), ['b', 'a']);
});

test('List: take and drop', async () => {
    assert.deepStrictEqual(await evaluate('(list/take (list 1 2 3 4 5) 3)'), [1, 2, 3]);
    assert.deepStrictEqual(await evaluate('(list/drop (list 1 2 3 4 5) 2)'), [3, 4, 5]);
});

test('List: append', async () => {
    assert.deepStrictEqual(await evaluate('(list/append (list 1 2) (list 3 4))'), [1, 2, 3, 4]);
    assert.deepStrictEqual(await evaluate('(list/append (list 1) (list 2) (list 3))'), [1, 2, 3]);
});

test('List: flatten', async () => {
    assert.deepStrictEqual(await evaluate('(list/flatten (list 1 (list 2 3) 4))'), [1, 2, 3, 4]);
    assert.deepStrictEqual(await evaluate('(list/flatten (list 1 (list 2 (list 3))))'), [1, 2, 3]);
});

test('List: includes?', async () => {
    assert.strictEqual(await evaluate('(list/includes? (list 1 2 3) 2)'), true);
    assert.strictEqual(await evaluate('(list/includes? (list 1 2 3) 5)'), false);
});

test('List: sort', async () => {
    assert.deepStrictEqual(await evaluate('(list/sort (list 3 1 4 1 5))'), [1, 1, 3, 4, 5]);
    assert.deepStrictEqual(await evaluate('(list/sort (list "c" "a" "b"))'), ['a', 'b', 'c']);
});

test('List: map with user-defined function', async () => {
    const code = `
        (def double (x) (* x 2))
        (list/map double (list 1 2 3))
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [2, 4, 6]);
});

test('List: map with anonymous function', async () => {
    const code = `(list/map (fun (x) (* x 3)) (list 1 2 3))`;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [3, 6, 9]);
});

test('List: filter with user-defined function', async () => {
    const code = `
        (def gt2 (x) (> x 2))
        (list/filter gt2 (list 1 2 3 4))
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [3, 4]);
});

test('List: filter with anonymous function', async () => {
    const code = `(list/filter (fun (x) (< x 3)) (list 1 2 3 4))`;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [1, 2]);
});

test('List: reduce function', async () => {
    const result = await evaluate('(list/reduce + 0 (list 1 2 3 4))');
    assert.strictEqual(result, 10);

    const product = await evaluate('(list/reduce * 1 (list 2 3 4))');
    assert.strictEqual(product, 24);
});
