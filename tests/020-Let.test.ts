import { test } from 'node:test';
import assert from 'assert/strict';

import { Parser } from '../src/Slight/Parser.js';
import { LetNode, SymbolNode, NumberNode, CallNode } from '../src/Slight/AST.js';
import { Token } from '../src/Slight/Types.js';
import { astToPlainObject } from './utils/astToPlainObject.js';

test('Parser - parses simple let binding', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'let', sequence_id: 2 },
        { type: 'LPAREN', source: '(', sequence_id: 3 },
        { type: 'LPAREN', source: '(', sequence_id: 4 },
        { type: 'SYMBOL', source: 'x', sequence_id: 5 },
        { type: 'NUMBER', source: '5', sequence_id: 6 },
        { type: 'RPAREN', source: ')', sequence_id: 7 },
        { type: 'RPAREN', source: ')', sequence_id: 8 },
        { type: 'SYMBOL', source: 'x', sequence_id: 9 },
        { type: 'RPAREN', source: ')', sequence_id: 10 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const ast = results[0] as any;
    assert.equal(ast.type, 'LET');
    assert.equal(ast.bindings.length, 1);
    assert.equal(ast.bindings[0].name, 'x');
    assert.equal(ast.bindings[0].value.type, 'NUMBER');
    assert.equal(ast.bindings[0].value.value, 5);
    assert.equal(ast.body.type, 'SYMBOL');
    assert.equal(ast.body.name, 'x');
});

test('Parser - parses multiple let bindings', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'let', sequence_id: 2 },
        { type: 'LPAREN', source: '(', sequence_id: 3 },
        { type: 'LPAREN', source: '(', sequence_id: 4 },
        { type: 'SYMBOL', source: 'x', sequence_id: 5 },
        { type: 'NUMBER', source: '5', sequence_id: 6 },
        { type: 'RPAREN', source: ')', sequence_id: 7 },
        { type: 'LPAREN', source: '(', sequence_id: 8 },
        { type: 'SYMBOL', source: 'y', sequence_id: 9 },
        { type: 'NUMBER', source: '10', sequence_id: 10 },
        { type: 'RPAREN', source: ')', sequence_id: 11 },
        { type: 'RPAREN', source: ')', sequence_id: 12 },
        { type: 'LPAREN', source: '(', sequence_id: 13 },
        { type: 'SYMBOL', source: '+', sequence_id: 14 },
        { type: 'SYMBOL', source: 'x', sequence_id: 15 },
        { type: 'SYMBOL', source: 'y', sequence_id: 16 },
        { type: 'RPAREN', source: ')', sequence_id: 17 },
        { type: 'RPAREN', source: ')', sequence_id: 18 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const ast = results[0] as any;
    assert.equal(ast.type, 'LET');
    assert.equal(ast.bindings.length, 2);
    assert.equal(ast.bindings[0].name, 'x');
    assert.equal(ast.bindings[0].value.value, 5);
    assert.equal(ast.bindings[1].name, 'y');
    assert.equal(ast.bindings[1].value.value, 10);
    assert.equal(ast.body.type, 'CALL');
    const body = ast.body as any;
    assert.equal(body.elements[0].name, '+');
});

test('Parser - parses empty let bindings', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'let', sequence_id: 2 },
        { type: 'LPAREN', source: '(', sequence_id: 3 },
        { type: 'RPAREN', source: ')', sequence_id: 4 },
        { type: 'NUMBER', source: '42', sequence_id: 5 },
        { type: 'RPAREN', source: ')', sequence_id: 6 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const ast = results[0] as any;
    assert.equal(ast.type, 'LET');
    assert.equal(ast.bindings.length, 0);
    assert.equal(ast.body.type, 'NUMBER');
    assert.equal(ast.body.value, 42);
});

test('Parser - rejects let with invalid binding format', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'let', sequence_id: 2 },
        { type: 'LPAREN', source: '(', sequence_id: 3 },
        { type: 'SYMBOL', source: 'x', sequence_id: 4 },  // Missing parentheses around binding
        { type: 'NUMBER', source: '5', sequence_id: 5 },
        { type: 'RPAREN', source: ')', sequence_id: 6 },
        { type: 'SYMBOL', source: 'x', sequence_id: 7 },
        { type: 'RPAREN', source: ')', sequence_id: 8 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const error = results[0] as any;
    assert.equal(error.type, 'ERROR');
    assert.match(error.message, /Invalid let syntax/);
});

test('Parser - rejects let without body', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'let', sequence_id: 2 },
        { type: 'LPAREN', source: '(', sequence_id: 3 },
        { type: 'LPAREN', source: '(', sequence_id: 4 },
        { type: 'SYMBOL', source: 'x', sequence_id: 5 },
        { type: 'NUMBER', source: '5', sequence_id: 6 },
        { type: 'RPAREN', source: ')', sequence_id: 7 },
        { type: 'RPAREN', source: ')', sequence_id: 8 },
        // Missing body
        { type: 'RPAREN', source: ')', sequence_id: 9 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const error = results[0] as any;
    assert.equal(error.type, 'ERROR');
    assert.match(error.message, /Invalid let syntax/);
});

test('Parser - rejects let with non-symbol binding name', async (t) => {
    const parser = new Parser();
    const input: Token[] = [
        { type: 'LPAREN', source: '(', sequence_id: 1 },
        { type: 'SYMBOL', source: 'let', sequence_id: 2 },
        { type: 'LPAREN', source: '(', sequence_id: 3 },
        { type: 'LPAREN', source: '(', sequence_id: 4 },
        { type: 'NUMBER', source: '5', sequence_id: 5 },  // Number instead of symbol for name
        { type: 'NUMBER', source: '10', sequence_id: 6 },
        { type: 'RPAREN', source: ')', sequence_id: 7 },
        { type: 'RPAREN', source: ')', sequence_id: 8 },
        { type: 'SYMBOL', source: 'x', sequence_id: 9 },
        { type: 'RPAREN', source: ')', sequence_id: 10 }
    ];

    const results = [];
    for await (const ast of parser.run(async function* () { for (const item of input) yield item; }())) {
        results.push(ast);
    }

    assert.equal(results.length, 1);
    const error = results[0] as any;
    assert.equal(error.type, 'ERROR');
    assert.match(error.message, /binding name must be a symbol/);
});