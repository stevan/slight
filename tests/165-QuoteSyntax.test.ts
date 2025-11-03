import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';

async function* stringSource(code: string) {
    yield code;
}

async function evaluate(code: string): Promise<any> {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(stringSource(code));
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);

    let lastResult: any;
    for await (const result of interpreter.run(expanded)) {
        lastResult = result.value;
    }
    return lastResult;
}

test('Quote syntax - simple symbol', async () => {
    const result = await evaluate("'foo");
    assert.strictEqual(result, 'foo');
});

test('Quote syntax - number', async () => {
    const result = await evaluate("'123");
    assert.strictEqual(result, 123);
});

test('Quote syntax - boolean', async () => {
    const result = await evaluate("'true");
    assert.strictEqual(result, true);
});

test('Quote syntax - list', async () => {
    const result = await evaluate("'(a b c)");
    assert.deepStrictEqual(result, ['a', 'b', 'c']);
});

test('Quote syntax - numeric list', async () => {
    const result = await evaluate("'(1 2 3)");
    assert.deepStrictEqual(result, [1, 2, 3]);
});

test('Quote syntax - nested list', async () => {
    const result = await evaluate("'(a (b c) d)");
    assert.deepStrictEqual(result, ['a', ['b', 'c'], 'd']);
});

test('Quote syntax - empty list', async () => {
    const result = await evaluate("'()");
    assert.deepStrictEqual(result, []);
});

test('Quote syntax - nested quotes', async () => {
    const result = await evaluate("''foo");
    assert.deepStrictEqual(result, ['quote', 'foo']);
});

test('Quote syntax - triple nested quotes', async () => {
    const result = await evaluate("'''foo");
    assert.deepStrictEqual(result, ['quote', ['quote', 'foo']]);
});

test('Quote syntax - quoted expression not evaluated', async () => {
    const result = await evaluate("'(+ 1 2)");
    assert.deepStrictEqual(result, ['+', 1, 2]);
});

test('Quote syntax vs evaluation', async () => {
    const evaluated = await evaluate("(+ 1 2)");
    const quoted = await evaluate("'(+ 1 2)");
    assert.strictEqual(evaluated, 3);
    assert.deepStrictEqual(quoted, ['+', 1, 2]);
});

test('Quote syntax in list', async () => {
    const result = await evaluate("(list 'a 'b 'c)");
    assert.deepStrictEqual(result, ['a', 'b', 'c']);
});

test('Quote syntax with head function', async () => {
    const result = await evaluate("(head '(1 2 3))");
    assert.strictEqual(result, 1);
});

test('Quote syntax with tail function', async () => {
    const result = await evaluate("(tail '(a b c))");
    assert.deepStrictEqual(result, ['b', 'c']);
});

test('Quote syntax equivalence with explicit quote', async () => {
    const quoteForm = await evaluate("(quote foo)");
    const quoteSyntax = await evaluate("'foo");
    assert.strictEqual(quoteForm, quoteSyntax);
});

test('Quote syntax - complex nested structure', async () => {
    const result = await evaluate("'((a b) (c (d e)) f)");
    assert.deepStrictEqual(result, [['a', 'b'], ['c', ['d', 'e']], 'f']);
});

test('Quote syntax - quoted function definition', async () => {
    const result = await evaluate("'(defun foo (x) (+ x 1))");
    assert.deepStrictEqual(result, ['defun', 'foo', ['x'], ['+', 'x', 1]]);
});

test('Quote syntax in macro', async () => {
    // Need to evaluate both expressions in the same interpreter context
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    // Define the macro
    const code1 = "(defmacro when (test body) (list 'cond (list test body)))";
    const tokens1 = tokenizer.run(stringSource(code1));
    const asts1 = parser.run(tokens1);
    const expanded1 = macroExpander.run(asts1);
    for await (const _ of interpreter.run(expanded1)) {
        // Just consume the output
    }

    // Use the macro
    const code2 = "(when (> 5 3) 42)";
    const tokens2 = tokenizer.run(stringSource(code2));
    const asts2 = parser.run(tokens2);
    const expanded2 = macroExpander.run(asts2);

    let result;
    for await (const output of interpreter.run(expanded2)) {
        result = output.value;
    }

    assert.strictEqual(result, 42);
});

test('Quote syntax - preserves special forms', async () => {
    const result = await evaluate("'(cond ((> x 10) true) (else false))");
    assert.deepStrictEqual(result, ['cond', [['>', 'x', 10], true], ['else', false]]);
});