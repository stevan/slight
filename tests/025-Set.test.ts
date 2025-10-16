import { test } from 'node:test';
import assert from 'assert/strict';

import { Parser } from '../src/Slight/Parser.js';
import { SetNode, SymbolNode, NumberNode } from '../src/Slight/AST.js';
import { Token } from '../src/Slight/Types.js';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Interpreter } from '../src/Slight/Interpreter.js';

// ============================================================================
// Parser Tests
// ============================================================================

test('Parser - parses simple set!', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'set!', sequence_id: 2 },
        { type: 'SYMBOL', source: 'x', sequence_id: 3 },
        { type: 'NUMBER', source: '42', sequence_id: 4 },
        { type: 'RPAREN', source: ')', sequence_id: 5 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const ast = results[0] as any;
    assert.equal(ast.type, 'SET');
    assert.equal(ast.name, 'x');
    assert.equal(ast.value.type, 'NUMBER');
    assert.equal(ast.value.value, 42);
});

test('Parser - rejects set! with wrong number of arguments', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'set!', sequence_id: 2 },
        { type: 'SYMBOL', source: 'x', sequence_id: 3 },
        { type: 'RPAREN', source: ')', sequence_id: 4 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const error = results[0] as any;
    assert.equal(error.type, 'ERROR');
    assert.match(error.message, /Invalid set! syntax/);
});

test('Parser - rejects set! with non-symbol name', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'set!', sequence_id: 2 },
        { type: 'NUMBER', source: '42', sequence_id: 3 },  // Number instead of symbol
        { type: 'NUMBER', source: '99', sequence_id: 4 },
        { type: 'RPAREN', source: ')', sequence_id: 5 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const error = results[0] as any;
    assert.equal(error.type, 'ERROR');
    assert.match(error.message, /name must be a symbol/);
});

// ============================================================================
// Integration Tests - Global Variables
// ============================================================================

test('set! - mutates global variable', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(def x 10)',
        'x',
        '(set! x 20)',
        'x'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, 10, 20, 20]);
});

test('set! - mutates global variable with expression', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(def counter 0)',
        '(set! counter (+ counter 1))',
        'counter',
        '(set! counter (+ counter 1))',
        'counter'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, 1, 1, 2, 2]);
});

test('set! - errors on undefined variable', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(set! undefined-var 42)'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);

    assert.equal(results.length, 1);
    assert.equal(results[0].value.type, 'ERROR');
    assert.match(results[0].value.message, /Cannot set! undefined variable/);
});

// ============================================================================
// Integration Tests - Local Scopes
// ============================================================================

test('set! - mutates local variable in let', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(let ((x 5)) (begin (set! x 99) x))'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [99]);
});

test('set! - mutates function parameter', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(def increment (x) (begin (set! x (+ x 1)) x))',
        '(increment 10)'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, 11]);
});

test('set! - local mutation does not affect global', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(def x 10)',
        '(let ((x 5)) (begin (set! x 99) x))',
        'x'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, 99, 10]);
});

test('set! - mutates global from within let when no shadowing', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(def x 10)',
        '(let ((y 5)) (begin (set! x 99) x))',
        'x'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, 99, 99]);
});

// ============================================================================
// Integration Tests - Complex Cases
// ============================================================================

test('set! - works in iterative function (accumulator)', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(def count-up (n) (let ((acc 0) (i 0)) (begin (set! i (+ i 1)) (set! acc (+ acc i)) (set! i (+ i 1)) (set! acc (+ acc i)) (set! i (+ i 1)) (set! acc (+ acc i)) (set! i (+ i 1)) (set! acc (+ acc i)) (set! i (+ i 1)) (set! acc (+ acc i)) acc)))',
        '(count-up 5)'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, 15]);
});

test('set! - multiple variables in sequence', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(def a 1)',
        '(def b 2)',
        '(def c 3)',
        '(set! a (+ a 10))',
        '(set! b (+ b 20))',
        '(set! c (+ c 30))',
        '(list a b c)'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, true, true, 11, 22, 33, [11, 22, 33]]);
});

test('set! - swap variables using let', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = [
        '(def x 1)',
        '(def y 2)',
        '(let ((temp x)) (begin (set! x y) (set! y temp) temp))',
        '(list x y)'
    ];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);
    assert.deepStrictEqual(results.map(x => x.value), [true, true, 1, [2, 1]]);
});
