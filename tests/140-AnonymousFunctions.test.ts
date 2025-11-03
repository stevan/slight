import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { Interpreter } from '../src/Slight/Interpreter.js';

// Helper to run Slight code and get results
async function runSlight(code: string): Promise<any[]> {
    async function* mockAsyncGen(items: string[]) {
        for (const i of items) yield i;
    }

    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(mockAsyncGen([code]));
    const asts = parser.run(tokens);
    const results: any[] = [];
    for await (const result of interpreter.run(asts)) {
        results.push(result);
    }
    return results;
}

test('fun creates anonymous function', async () => {
    const code = `
        (defvar add (fun (x y) (+ x y)))
        (add 3 4)
    `;
    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 7);
});

test('fun can be passed as argument', async () => {
    const code = `
        (defun apply (f x) (f x))
        (apply (fun (n) (* n 2)) 5)
    `;
    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 10);
});

test('fun can be immediately invoked', async () => {
    const code = `
        ((fun (x y) (+ x y)) 10 20)
    `;
    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 30);
});

test('fun captures lexical environment (closure)', async () => {
    const code = `
        (defun make-adder (x)
          (fun (y) (+ x y)))

        (defvar add5 (make-adder 5))
        (add5 3)
    `;
    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 8);
});

test('fun works with higher-order functions', async () => {
    const code = `
        (defun map (f lst)
          (cond
            ((empty? lst) (list))
            (else (cons (f (head lst)) (map f (tail lst))))))

        (map (fun (x) (* x 2)) (list 1 2 3))
    `;
    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.deepStrictEqual(finalResult.value, [2, 4, 6]);
});

test('fun can return another function', async () => {
    const code = `
        (defvar curry-add (fun (x) (fun (y) (+ x y))))
        (defvar add3 (curry-add 3))
        (add3 7)
    `;
    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 10);
});

test('fun with let binding', async () => {
    const code = `
        (defvar compute (fun (x)
          (let ((doubled (* x 2)))
            (+ doubled 1))))
        (compute 5)
    `;
    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 11);
});

test('fun with no parameters', async () => {
    const code = `
        (defvar get-value (fun () 42))
        (get-value)
    `;
    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 42);
});

test('nested fun expressions', async () => {
    const code = `
        (defun compose (f g)
          (fun (x) (f (g x))))

        (defvar add1 (fun (x) (+ x 1)))
        (defvar double (fun (x) (* x 2)))
        (defun add1-then-double (compose double add1))

        (add1-then-double 5)
    `;
    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.ok(finalResult, 'Should have a result');
    assert.strictEqual(finalResult.value, 12); // (5 + 1) * 2
});

test('fun used in map-like operation', async () => {
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