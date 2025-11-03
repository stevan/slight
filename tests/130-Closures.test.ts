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
        (defun make-adder (x)
          (defun adder (y) (+ x y)))

        (defvar add5 (make-adder 5))
        (add5 3)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 8);
});

test('closure with let binding', async () => {
    const code = `
        (defun make-counter ()
          (let ((count 0))
            (defun increment ()
              (let ((new-count (+ count 1)))
                new-count))))

        (defvar counter (make-counter))
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
        (defun make-multiplier-factory (factor)
          (defun make-multiplier (base)
            (defun multiply (x) (* factor (* base x)))))

        (defvar make-double (make-multiplier-factory 2))
        (defvar double-of-10 (make-double 10))
        (double-of-10 5)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 100); // 2 * 10 * 5
});

test('closure captures multiple variables', async () => {
    const code = `
        (defun make-operation (op a b)
          (defun apply-op ()
            (op a b)))

        (defvar add-op (make-operation + 10 20))
        (add-op)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 30);
});

test('closure with higher-order functions', async () => {
    const code = `
        (defun compose (f g)
          (defun composed (x) (f (g x))))

        (defun add1 (x) (+ x 1))
        (defun double (x) (* x 2))
        (defun add1-then-double (compose double add1))

        (add1-then-double 5)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 12); // (5 + 1) * 2
});

test('closure preserves environment even after outer function returns', async () => {
    const code = `
        (defun make-greeter (greeting)
          (defun greet (name)
            (list greeting name)))

        (defvar hello (make-greeter "Hello"))
        (defvar goodbye (make-greeter "Goodbye"))

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
        (defun make-bounded-counter (min max)
          (let ((current min))
            (defun next ()
              (cond
                ((< current max)
                  (let ((result current))
                    result))
                (else max)))))

        (defvar counter (make-bounded-counter 1 3))
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
        (defun make-mapper (f)
          (fun (lst)
            (cond
              ((empty? lst) (list))
              (else (cons (f (head lst)) ((make-mapper f) (tail lst)))))))

        (defvar double-mapper (make-mapper (fun (x) (* x 2))))
        (double-mapper (list 1 2 3))
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.deepStrictEqual(finalResult.value, [2, 4, 6]);
});

test('closure with partial application', async () => {
    const code = `
        (defun curry-add (x)
          (defun add-x (y)
            (defun add-y (z)
              (+ x (+ y z)))))

        (defvar add1 (curry-add 1))
        (defvar add1-2 (add1 2))
        (add1-2 3)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 6); // 1 + 2 + 3
});

test('closure scope isolation', async () => {
    const code = `
        (defvar x 100)

        (defun make-closure (x)
          (defun get-x () x))

        (defvar closure1 (make-closure 1))
        (defvar closure2 (make-closure 2))

        (list (closure1) (closure2) x)
    `;

    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.deepStrictEqual(finalResult.value, [1, 2, 100]);
});