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

test('String: case conversion', async () => {
    assert.strictEqual(await evaluate('(string/upper "hello")'), 'HELLO');
    assert.strictEqual(await evaluate('(string/lower "HELLO")'), 'hello');
    assert.strictEqual(await evaluate('(string/upper "hello world")'), 'HELLO WORLD');
});

test('String: index-of and last-index-of', async () => {
    assert.strictEqual(await evaluate('(string/index-of "hello world" "o")'), 4);
    assert.strictEqual(await evaluate('(string/index-of "hello world" "world")'), 6);
    assert.strictEqual(await evaluate('(string/last-index-of "hello world" "o")'), 7);
});

test('String: includes, starts-with, ends-with', async () => {
    assert.strictEqual(await evaluate('(string/includes? "hello world" "world")'), true);
    assert.strictEqual(await evaluate('(string/includes? "hello world" "foo")'), false);
    assert.strictEqual(await evaluate('(string/starts-with? "hello" "he")'), true);
    assert.strictEqual(await evaluate('(string/starts-with? "hello" "lo")'), false);
    assert.strictEqual(await evaluate('(string/ends-with? "hello" "lo")'), true);
});

test('String: trim operations', async () => {
    assert.strictEqual(await evaluate('(string/trim "  hello  ")'), 'hello');
    assert.strictEqual(await evaluate('(string/trim-start "  hello  ")'), 'hello  ');
    assert.strictEqual(await evaluate('(string/trim-end "  hello  ")'), '  hello');
});

test('String: repeat', async () => {
    assert.strictEqual(await evaluate('(string/repeat "!" 3)'), '!!!');
    assert.strictEqual(await evaluate('(string/repeat "ab" 2)'), 'abab');
});

test('String: pad operations', async () => {
    assert.strictEqual(await evaluate('(string/pad-start "5" 3 "0")'), '005');
    assert.strictEqual(await evaluate('(string/pad-end "5" 3 "0")'), '500');
});

test('String: replace and replace-all', async () => {
    assert.strictEqual(await evaluate('(string/replace "hello world" "world" "there")'), 'hello there');
    assert.strictEqual(await evaluate('(string/replace-all "foo foo foo" "foo" "bar")'), 'bar bar bar');
});

test('String: split and join', async () => {
    const splitResult = await evaluate('(string/split "a,b,c" ",")');
    assert.deepStrictEqual(splitResult, ['a', 'b', 'c']);

    assert.strictEqual(await evaluate('(string/join (list "a" "b") "-")'), 'a-b');
    assert.strictEqual(await evaluate('(string/join (list "one" "two" "three") ",")'), 'one,two,three');
});

test('String: length', async () => {
    assert.strictEqual(await evaluate('(string/length "hello")'), 5);
    assert.strictEqual(await evaluate('(string/length "")'), 0);
});

test('String: slice and substring', async () => {
    assert.strictEqual(await evaluate('(string/slice "hello world" 0 5)'), 'hello');
    assert.strictEqual(await evaluate('(string/substring "hello world" 6 11)'), 'world');
    assert.strictEqual(await evaluate('(string/slice "hello" 1)'), 'ello');
});

test('String: char-at and char-code', async () => {
    assert.strictEqual(await evaluate('(string/char-at "hello" 0)'), 'h');
    assert.strictEqual(await evaluate('(string/char-at "hello" 4)'), 'o');
    assert.strictEqual(await evaluate('(string/char-code "A" 0)'), 65);
    assert.strictEqual(await evaluate('(string/char-code "hello" 0)'), 104);
});

test('String: from-char-code', async () => {
    assert.strictEqual(await evaluate('(string/from-char-code 65)'), 'A');
    assert.strictEqual(await evaluate('(string/from-char-code 72 101 108 108 111)'), 'Hello');
});

test('String: concat', async () => {
    assert.strictEqual(await evaluate('(string/concat "hello" " " "world")'), 'hello world');
    assert.strictEqual(await evaluate('(string/concat "a" "b" "c")'), 'abc');
});
