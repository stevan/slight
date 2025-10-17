import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';

describe('Type Inspection Primitives', () => {
    async function* mockAsyncGen(items: string[]) {
        for (const i of items) yield i;
    }

    test('type/of returns correct type strings', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(type/of 42)',
            '(type/of "hello")',
            '(type/of true)',
            '(type/of false)',
            '(type/of (list 1 2 3))',
            '(type/of (list))',
            '(type/of ())',
            '(type/of +)',
            '(def add (fun (a b) (+ a b)))',
            '(type/of add)',
            '(try (throw "test error") (catch e (type/of e)))'
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, [
            'NUMBER',
            'STRING',
            'BOOLEAN',
            'BOOLEAN',
            'LIST',
            'NIL',
            'NIL',
            'FUNCTION',
            true,  // def returns true
            'FUNCTION',
            'ERROR'
        ]);
    });

    test('type/of evaluates expressions before checking type', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(type/of (+ 1 2))',
            '(def x "hello")',
            '(type/of x)',
            '(def get-list (fun () (list 1 2 3)))',
            '(type/of (get-list))'
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, [
            'NUMBER',
            true,  // def returns true
            'STRING',
            true,  // def returns true
            'LIST'
        ]);
    });

    test('type/of with quoted symbols', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(type/of (quote x))',  // Quoted symbols become strings in this implementation
            '(type/of (quote 42))', // Quoted numbers stay numbers
            '(type/of (quote (a b c)))' // Quoted lists stay lists
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, ['STRING', 'NUMBER', 'LIST']);
    });

    test('type/is? predicate checks', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(type/is? 42 "NUMBER")',
            '(type/is? "hello" "STRING")',
            '(type/is? (list 1 2) "LIST")',
            '(type/is? 42 "STRING")',
            '(type/is? "hello" "NUMBER")'
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, [true, true, true, false, false]);
    });

    test('type/is? with dynamic type checking', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(def x 10)',
            '(def y 20)',
            '(type/is? x (type/of y))',
            '(def z "string")',
            '(type/is? x (type/of z))'
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, [
            true,  // def x
            true,  // def y
            true,  // x and y both NUMBER
            true,  // def z
            false  // x is NUMBER, z is STRING
        ]);
    });

    test('type/assert returns value on success', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(type/assert 42 "NUMBER")',
            '(type/assert "hello" "STRING")',
            '(type/assert (list 1 2 3) "LIST")'
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, [42, 'hello', [1, 2, 3]]);
    });

    test('type/assert throws error on type mismatch', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(try (type/assert 42 "STRING") (catch e e.message))',
            '(try (type/assert "hello" "NUMBER") (catch e e.message))'
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, [
            'Type assertion failed: expected STRING, got NUMBER',
            'Type assertion failed: expected NUMBER, got STRING'
        ]);
    });

    test('type/assert in functions for parameter validation', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(def safe-add (fun (a b) (begin (type/assert a "NUMBER") (type/assert b "NUMBER") (+ a b))))',
            '(safe-add 10 20)',
            '(try (safe-add 10 "hello") (catch e e.message))'
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, [
            true,  // def returns true
            30,
            'Type assertion failed: expected NUMBER, got STRING'
        ]);
    });

    test('type inspection with nested structures', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(type/of (list (list 1 2) (list 3 4)))',
            '(def nested (list (list 1 2) "hello" true))',
            '(type/of (head nested))',
            '(type/of (head (tail nested)))',
            '(type/of (head (tail (tail nested))))'
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, [
            'LIST',
            true,  // def returns true
            'LIST',
            'STRING',
            'BOOLEAN'
        ]);
    });

    test('type inspection with let bindings', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(let ((x 42) (y "hello")) (list (type/of x) (type/of y)))'
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, [['NUMBER', 'STRING']]);
    });

    test('type inspection with closures', async () => {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const input = [
            '(def make-counter (fun () (let ((count 0)) (fun () (begin (set! count (+ count 1)) count)))))',
            '(def counter (make-counter))',
            '(type/of counter)',
            '(counter)'
        ];

        const tokens = tokenizer.run(mockAsyncGen(input));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);
        const results = [];
        for await (const result of interpreter.run(expanded)) {
            results.push(result.value);
        }

        assert.deepStrictEqual(results, [
            true,  // def returns true
            true,  // def returns true
            'FUNCTION',
            1  // counter returns 1
        ]);
    });
});