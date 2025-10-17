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

test('Math: modulo operation', async () => {
    assert.strictEqual(await evaluate('(math/mod 10 3)'), 1);
    assert.strictEqual(await evaluate('(math/mod 17 5)'), 2);
    assert.strictEqual(await evaluate('(mod 10 3)'), 1); // test alias
});

test('Math: absolute value', async () => {
    assert.strictEqual(await evaluate('(math/abs -5)'), 5);
    assert.strictEqual(await evaluate('(math/abs 5)'), 5);
    assert.strictEqual(await evaluate('(math/abs 0)'), 0);
});

test('Math: sign function', async () => {
    assert.strictEqual(await evaluate('(math/sign -5)'), -1);
    assert.strictEqual(await evaluate('(math/sign 5)'), 1);
    assert.strictEqual(await evaluate('(math/sign 0)'), 0);
});

test('Math: min and max', async () => {
    assert.strictEqual(await evaluate('(math/min 3 1 4 1 5)'), 1);
    assert.strictEqual(await evaluate('(math/max 3 1 4 1 5)'), 5);
    assert.strictEqual(await evaluate('(math/min 10 20)'), 10);
    assert.strictEqual(await evaluate('(math/max 10 20)'), 20);
});

test('Math: floor, ceil, round, trunc', async () => {
    assert.strictEqual(await evaluate('(math/floor 3.7)'), 3);
    assert.strictEqual(await evaluate('(math/ceil 3.2)'), 4);
    assert.strictEqual(await evaluate('(math/round 3.5)'), 4);
    assert.strictEqual(await evaluate('(math/round 3.4)'), 3);
    assert.strictEqual(await evaluate('(math/trunc 3.9)'), 3);
    assert.strictEqual(await evaluate('(math/trunc -3.9)'), -3);
});

test('Math: power and square root', async () => {
    assert.strictEqual(await evaluate('(math/pow 2 8)'), 256);
    assert.strictEqual(await evaluate('(math/pow 3 2)'), 9);
    assert.strictEqual(await evaluate('(math/sqrt 16)'), 4);
    assert.strictEqual(await evaluate('(math/sqrt 9)'), 3);
});

test('Math: exponential and logarithms', async () => {
    const e = await evaluate('(math/exp 1)');
    assert.ok(Math.abs(e - Math.E) < 0.0001);

    assert.strictEqual(await evaluate('(math/log (math/e))'), 1);
    assert.strictEqual(await evaluate('(math/log10 100)'), 2);
    assert.strictEqual(await evaluate('(math/log10 1000)'), 3);
});

test('Math: trigonometric functions', async () => {
    const piOver2 = await evaluate('(/ (math/pi) 2)');
    const sin = await evaluate('(math/sin (/ (math/pi) 2))');
    assert.ok(Math.abs(sin - 1) < 0.0001);

    const cos0 = await evaluate('(math/cos 0)');
    assert.ok(Math.abs(cos0 - 1) < 0.0001);

    const tan0 = await evaluate('(math/tan 0)');
    assert.ok(Math.abs(tan0) < 0.0001);
});

test('Math: inverse trigonometric functions', async () => {
    const asin = await evaluate('(math/asin 1)');
    assert.ok(Math.abs(asin - Math.PI / 2) < 0.0001);

    const acos = await evaluate('(math/acos 1)');
    assert.ok(Math.abs(acos) < 0.0001);

    const atan = await evaluate('(math/atan 1)');
    assert.ok(Math.abs(atan - Math.PI / 4) < 0.0001);
});

test('Math: atan2 for quadrant-aware arctangent', async () => {
    const atan2 = await evaluate('(math/atan2 1 1)');
    assert.ok(Math.abs(atan2 - Math.PI / 4) < 0.0001);
});

test('Math: constants', async () => {
    const pi = await evaluate('(math/pi)');
    assert.ok(Math.abs(pi - Math.PI) < 0.0001);

    const e = await evaluate('(math/e)');
    assert.ok(Math.abs(e - Math.E) < 0.0001);
});

test('Math: random returns value in range', async () => {
    const rand = await evaluate('(math/random)');
    assert.ok(typeof rand === 'number');
    assert.ok(rand >= 0 && rand < 1);
});

test('Math: complex calculation from docs', async () => {
    // Example: random 0-100
    const rand = await evaluate('(* (math/random) 100)');
    assert.ok(typeof rand === 'number');
    assert.ok(rand >= 0 && rand < 100);
});
