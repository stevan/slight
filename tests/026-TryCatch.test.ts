import { test } from 'node:test';
import assert from 'assert/strict';

import { Parser } from '../src/Slight/Parser.js';
import { TryNode, ThrowNode, SymbolNode, StringNode } from '../src/Slight/AST.js';
import { Token } from '../src/Slight/Types.js';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Interpreter } from '../src/Slight/Interpreter.js';

// ============================================================================
// Parser Tests
// ============================================================================

test('Parser - parses simple throw', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'throw', sequence_id: 2 },
        { type: 'STRING', source: 'error message', sequence_id: 3 },
        { type: 'RPAREN', source: ')', sequence_id: 4 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const ast = results[0] as any;
    assert.equal(ast.type, 'THROW');
    assert.equal(ast.value.type, 'STRING');
});

test('Parser - rejects throw with no argument', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'throw', sequence_id: 2 },
        { type: 'RPAREN', source: ')', sequence_id: 3 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const error = results[0] as any;
    assert.equal(error.type, 'ERROR');
    assert.match(error.message, /Invalid throw syntax/);
});

test('Parser - parses try/catch', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'try', sequence_id: 2 },
        { type: 'NUMBER', source: '1', sequence_id: 3 },
        { type: 'LPAREN', source: '(', sequence_id: 4 },
        { type: 'SYMBOL', source: 'catch', sequence_id: 5 },
        { type: 'SYMBOL', source: 'e', sequence_id: 6 },
        { type: 'NUMBER', source: '2', sequence_id: 7 },
        { type: 'RPAREN', source: ')', sequence_id: 8 },
        { type: 'RPAREN', source: ')', sequence_id: 9 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const ast = results[0] as any;
    assert.equal(ast.type, 'TRY');
    assert.equal(ast.catchVar, 'e');
    assert.equal(ast.tryBody.length, 1);
    assert.equal(ast.catchBody.length, 1);
});

test('Parser - rejects try without catch', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'try', sequence_id: 2 },
        { type: 'NUMBER', source: '1', sequence_id: 3 },
        { type: 'RPAREN', source: ')', sequence_id: 4 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const error = results[0] as any;
    assert.equal(error.type, 'ERROR');
    assert.match(error.message, /Invalid try syntax/);
});

test('Parser - rejects catch without variable', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'try', sequence_id: 2 },
        { type: 'NUMBER', source: '1', sequence_id: 3 },
        { type: 'LPAREN', source: '(', sequence_id: 4 },
        { type: 'SYMBOL', source: 'catch', sequence_id: 5 },
        { type: 'RPAREN', source: ')', sequence_id: 6 },
        { type: 'RPAREN', source: ')', sequence_id: 7 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const error = results[0] as any;
    assert.equal(error.type, 'ERROR');
    assert.match(error.message, /Invalid catch syntax/);
});

// ============================================================================
// Integration Tests - Basic try/catch
// ============================================================================

test('try/catch - catches thrown error', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(try (throw "error!") (catch e "caught"))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), ["caught"]);
});

test('try/catch - returns try result when no error', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(try (+ 1 2) (catch e "caught"))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [3]);
});

test('try/catch - accesses error message', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(try (throw "my error") (catch e e.message))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), ["my error"]);
});

test('try/catch - multiple expressions in try block', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(try (+ 1 2) (+ 3 4) (throw "error") (catch e 99))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [99]);
});

test('try/catch - multiple expressions in catch block', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(try (throw "error") (catch e (+ 1 2) (+ 3 4)))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [7]);
});

// ============================================================================
// Integration Tests - Nested and Complex Cases
// ============================================================================

test('try/catch - nested try/catch', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(try (try (throw "inner") (catch e1 (throw "outer"))) (catch e2 e2.message))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), ["outer"]);
});

test('try/catch - in function', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(defun safe-eval (should-throw) (try (cond (should-throw (throw "error")) (else 42)) (catch e "caught")))',
        '(safe-eval false)',
        '(safe-eval true)'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, 42, "caught"]);
});

test('try/catch - with let bindings', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(let ((x 10)) (try (throw "error") (catch e x)))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [10]);
});

test('try/catch - error in expression', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(try (+ 1 undefined-var) (catch e "caught undefined"))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), ["caught undefined"]);
});

test('try/catch - re-throw error', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(try (try (throw "error") (catch e (throw e))) (catch e2 e2.message))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), ["error"]);
});

test('try/catch - conditional throw', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(defun check (x) (try (cond ((< x 0) (throw "negative")) (else x)) (catch e e.message)))',
        '(check 5)',
        '(check -3)'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, 5, "negative"]);
});

test('try/catch - with set!', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(defvar status "ok")',
        '(try (throw "failed") (catch e (set! status "error")))',
        'status'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, "error", "error"]);
});

test('try/catch - returns last expression from try', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(try (+ 1 2) (+ 3 4) (+ 5 6) (catch e 0))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [11]);
});
