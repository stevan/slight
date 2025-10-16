import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { Interpreter } from '../src/Slight/Interpreter.js';

// Helper to run Slight code and get results
async function runSlight(code: string) {
    async function* mockAsyncGen(items: string[]) {
        for (const i of items) yield i;
    }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();
    const tokens = tokenizer.run(mockAsyncGen([code]));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) {
        results.push(result);
    }
    return results;
}

test('closure captures lexical environment', async () => {
    const code = `
        (def make-adder (x)
          (def adder (y) (+ x y)))

        (def add5 (make-adder 5))
        (add5 3)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 8);
});

test('closure with let binding', async () => {
    const code = `
        (def make-counter ()
          (let ((count 0))
            (def increment ()
              (let ((new-count (+ count 1)))
                new-count))))

        (def counter (make-counter))
        (list (counter) (counter) (counter))
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    // This tests if the closure maintains state
    assert.deepStrictEqual(finalResult.value, [1, 1, 1]); // Without mutable state, should return [1, 1, 1]
});

test('nested closures', async () => {
    const code = `
        (def make-multiplier-factory (factor)
          (def make-multiplier (base)
            (def multiply (x) (* factor (* base x)))))

        (def make-double (make-multiplier-factory 2))
        (def double-of-10 (make-double 10))
        (double-of-10 5)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 100); // 2 * 10 * 5
});

test('closure captures multiple variables', async () => {
    const code = `
        (def make-operation (op a b)
          (def apply-op ()
            (op a b)))

        (def add-op (make-operation + 10 20))
        (add-op)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 30);
});

test('closure with higher-order functions', async () => {
    const code = `
        (def compose (f g)
          (def composed (x) (f (g x))))

        (def add1 (x) (+ x 1))
        (def double (x) (* x 2))
        (def add1-then-double (compose double add1))

        (add1-then-double 5)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 12); // (5 + 1) * 2
});

test('closure preserves environment even after outer function returns', async () => {
    const code = `
        (def make-greeter (greeting)
          (def greet (name)
            (list greeting name)))

        (def hello (make-greeter "Hello"))
        (def goodbye (make-greeter "Goodbye"))

        (list (hello "Alice") (goodbye "Bob"))
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.deepStrictEqual(finalResult.value, [
        ["Hello", "Alice"],
        ["Goodbye", "Bob"]
    ]);
});

test('closure with let and function parameters', async () => {
    const code = `
        (def make-bounded-counter (min max)
          (let ((current min))
            (def next ()
              (cond
                ((< current max)
                  (let ((result current))
                    result))
                (else max)))))

        (def counter (make-bounded-counter 1 3))
        (list (counter) (counter) (counter) (counter))
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    // Without mutable state, this will always return min
    assert.deepStrictEqual(finalResult.value, [1, 1, 1, 1]);
});

test('closure in map-like operation', async () => {
    const code = `
        (def make-mapper (f)
          (fun (lst)
            (cond
              ((empty? lst) (list))
              (else (cons (f (head lst)) ((make-mapper f) (tail lst)))))))

        (def double-mapper (make-mapper (fun (x) (* x 2))))
        (double-mapper (list 1 2 3))
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.deepStrictEqual(finalResult.value, [2, 4, 6]);
});

test('closure with partial application', async () => {
    const code = `
        (def curry-add (x)
          (def add-x (y)
            (def add-y (z)
              (+ x (+ y z)))))

        (def add1 (curry-add 1))
        (def add1-2 (add1 2))
        (add1-2 3)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 6); // 1 + 2 + 3
});

test('closure scope isolation', async () => {
    const code = `
        (def x 100)

        (def make-closure (x)
          (def get-x () x))

        (def closure1 (make-closure 1))
        (def closure2 (make-closure 2))

        (list (closure1) (closure2) x)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.deepStrictEqual(finalResult.value, [1, 2, 100]);
});