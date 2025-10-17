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
        lastResult = result.value;
    }
    return lastResult;
}

test('Core: addition with variadic arguments', async () => {
    assert.strictEqual(await evaluate('(+ 1 2)'), 3);
    assert.strictEqual(await evaluate('(+ 1 2 3)'), 6);
    assert.strictEqual(await evaluate('(+ 1 2 3 4)'), 10);
    assert.strictEqual(await evaluate('(+)'), 0); // identity
});

test('Core: subtraction and negation', async () => {
    assert.strictEqual(await evaluate('(- 10 3)'), 7);
    assert.strictEqual(await evaluate('(- 10 3 2)'), 5);
    assert.strictEqual(await evaluate('(- 5)'), -5); // unary negation
});

test('Core: multiplication with variadic arguments', async () => {
    assert.strictEqual(await evaluate('(* 2 3)'), 6);
    assert.strictEqual(await evaluate('(* 2 3 4)'), 24);
    assert.strictEqual(await evaluate('(*)'), 1); // identity
});

test('Core: division', async () => {
    assert.strictEqual(await evaluate('(/ 10 2)'), 5);
    assert.strictEqual(await evaluate('(/ 20 4)'), 5);
    assert.strictEqual(await evaluate('(/ 7 2)'), 3.5);
});

test('Core: equality comparison', async () => {
    assert.strictEqual(await evaluate('(== 1 1)'), true);
    assert.strictEqual(await evaluate('(== 1 2)'), false);
    assert.strictEqual(await evaluate('(== "a" "a")'), true);
    assert.strictEqual(await evaluate('(== true true)'), true);
});

test('Core: inequality comparison', async () => {
    assert.strictEqual(await evaluate('(!= 1 2)'), true);
    assert.strictEqual(await evaluate('(!= 2 2)'), false);
});

test('Core: less than comparison', async () => {
    assert.strictEqual(await evaluate('(< 1 2)'), true);
    assert.strictEqual(await evaluate('(< 2 1)'), false);
    assert.strictEqual(await evaluate('(< 2 2)'), false);
});

test('Core: greater than comparison', async () => {
    assert.strictEqual(await evaluate('(> 2 1)'), true);
    assert.strictEqual(await evaluate('(> 1 2)'), false);
    assert.strictEqual(await evaluate('(> 2 2)'), false);
});

test('Core: less than or equal comparison', async () => {
    assert.strictEqual(await evaluate('(<= 1 2)'), true);
    assert.strictEqual(await evaluate('(<= 2 2)'), true);
    assert.strictEqual(await evaluate('(<= 2 1)'), false);
});

test('Core: greater than or equal comparison', async () => {
    assert.strictEqual(await evaluate('(>= 2 1)'), true);
    assert.strictEqual(await evaluate('(>= 2 2)'), true);
    assert.strictEqual(await evaluate('(>= 1 2)'), false);
});

test('Core: logical AND', async () => {
    assert.strictEqual(await evaluate('(and true true)'), true);
    assert.strictEqual(await evaluate('(and true false)'), false);
    assert.strictEqual(await evaluate('(and false false)'), false);
    assert.strictEqual(await evaluate('(and true true true)'), true);
});

test('Core: logical OR', async () => {
    assert.strictEqual(await evaluate('(or false false)'), false);
    assert.strictEqual(await evaluate('(or true false)'), true);
    assert.strictEqual(await evaluate('(or false true)'), true);
    assert.strictEqual(await evaluate('(or false false false true)'), true);
});

test('Core: logical NOT', async () => {
    assert.strictEqual(await evaluate('(not true)'), false);
    assert.strictEqual(await evaluate('(not false)'), true);
});
