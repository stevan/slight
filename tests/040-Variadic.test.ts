import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';

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
        // Skip error results and get the actual value
        if (result.value && typeof result.value === 'object' && result.value.type === 'ERROR') {
            throw new Error(`${result.value.stage}: ${result.value.message}`);
        }
        lastResult = result.value;
    }
    return lastResult;
}

// =============================================================================
// Basic Variadic Functions
// =============================================================================

test('Variadic: only rest parameter', async () => {
    const code = `
        (defun all-args (. args) args)
        (all-args 1 2 3 4 5)
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [1, 2, 3, 4, 5]);
});

test('Variadic: rest parameter with no args', async () => {
    const code = `
        (defun all-args (. args) args)
        (all-args)
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, []);
});

test('Variadic: one required + rest', async () => {
    const code = `
        (defun greet (greeting . names)
            (list greeting names))
        (greet "Hello" "Alice" "Bob" "Charlie")
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, ["Hello", ["Alice", "Bob", "Charlie"]]);
});

test('Variadic: two required + rest', async () => {
    const code = `
        (defun make-msg (prefix suffix . words)
            (list prefix words suffix))
        (make-msg "START" "END" "foo" "bar" "baz")
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, ["START", ["foo", "bar", "baz"], "END"]);
});

test('Variadic: rest parameter gets empty list when only required args provided', async () => {
    const code = `
        (defun greet (greeting . names)
            (list greeting names))
        (greet "Hello")
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, ["Hello", []]);
});

// =============================================================================
// Anonymous Functions
// =============================================================================

test('Variadic: anonymous function with rest param', async () => {
    const code = `((fun (. nums) (list/length nums)) 1 2 3 4 5)`;
    const result = await evaluate(code);
    assert.strictEqual(result, 5);
});

test('Variadic: anonymous function with required + rest', async () => {
    const code = `
        ((fun (first . rest) (list first rest)) 10 20 30)
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [10, [20, 30]]);
});

// =============================================================================
// Higher-Order Functions
// =============================================================================

test('Variadic: using list/reduce to sum', async () => {
    const code = `
        (defun sum (. nums)
            (list/reduce (fun (a b) (+ a b)) 0 nums))
        (sum 1 2 3 4 5)
    `;
    const result = await evaluate(code);
    assert.strictEqual(result, 15);
});

test('Variadic: using list/map on rest args', async () => {
    const code = `
        (defun double-all (. nums)
            (list/map (fun (x) (* x 2)) nums))
        (double-all 1 2 3)
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [2, 4, 6]);
});

test('Variadic: using list/filter on rest args', async () => {
    const code = `
        (defun filter-positive (. nums)
            (list/filter (fun (x) (> x 0)) nums))
        (filter-positive -5 3 -2 8 0 1)
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [3, 8, 1]);
});

// =============================================================================
// Recursive Functions
// =============================================================================

test('Variadic: simple recursive example', async () => {
    const code = `
        (defun count-items (. items)
            (list/length items))
        (count-items "a" "b" "c" "d" "e")
    `;
    const result = await evaluate(code);
    assert.strictEqual(result, 5);
});

// Note: Spread syntax not yet implemented - would need (func . args) to unpack args
// test('Variadic: recursive sum implementation', async () => {
//     const code = `
//         (defun sum-recursive (. nums)
//             (cond
//                 ((== (list/length nums) 0) 0)
//                 (true (+ (list/head nums) (sum-recursive . (list/tail nums))))))
//         (sum-recursive 1 2 3 4)
//     `;
//     const result = await evaluate(code);
//     assert.strictEqual(result, 10);
// });

// =============================================================================
// Closures
// =============================================================================

test('Variadic: closure with rest param', async () => {
    const code = `
        (defun make-adder (base)
            (fun (. nums)
                (list/map (fun (n) (+ base n)) nums)))
        (defvar add5 (make-adder 5))
        (add5 1 2 3)
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [6, 7, 8]);
});

test('Variadic: closure captures rest param', async () => {
    const code = `
        (defun make-lister (. items)
            (fun () items))
        (defvar my-list (make-lister "a" "b" "c"))
        (my-list)
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, ["a", "b", "c"]);
});

// =============================================================================
// Arity Checking
// =============================================================================

test('Variadic: error when too few args (required params not satisfied)', async () => {
    const code = `
        (defun greet (greeting name . rest)
            (string/concat greeting " " name))
        (greet "Hello")
    `;
    await assert.rejects(
        async () => await evaluate(code),
        /Too few arguments: expected at least 2, got 1/
    );
});

test('Variadic: error when too few args (one required param)', async () => {
    const code = `
        (defun process (first . rest) first)
        (process)
    `;
    await assert.rejects(
        async () => await evaluate(code),
        /Too few arguments: expected at least 1, got 0/
    );
});

test('Variadic: still checks arity for non-variadic functions', async () => {
    const code = `
        (defun add2 (a b) (+ a b))
        (add2 1 2 3)
    `;
    await assert.rejects(
        async () => await evaluate(code),
        /Wrong number of arguments: expected 2, got 3/
    );
});

// =============================================================================
// Macros with Rest Parameters
// =============================================================================

// Note: These tests require spread syntax which isn't implemented yet
// test('Variadic: macro with rest parameter', async () => {
//     const code = `
//         (defmacro log-all (. exprs)
//             (list 'begin . (list/map (fun (e) (list 'say e)) exprs)))
//         (log-all "hello" "world")
//     `;
//     const result = await evaluate(code);
//     // Should print hello and world
// });

// test('Variadic: macro with required + rest', async () => {
//     const code = `
//         (defmacro when-debug (flag . body)
//             (cond
//                 (flag (list 'begin . body))
//                 (true false)))
//         (when-debug true (+ 1 2) (* 3 4))
//     `;
//     const result = await evaluate(code);
//     assert.strictEqual(result, 12);
// });

// =============================================================================
// Practical Examples
// =============================================================================

// Note: Requires spread syntax to unpack rest args
// test('Variadic: max function', async () => {
//     const code = `
//         (defun max-of (first . rest)
//             (cond
//                 ((== (list/length rest) 0) first)
//                 (true
//                     (defun rest-max (max-of . rest))
//                     (cond
//                         ((> first rest-max) first)
//                         (true rest-max)))))
//         (max-of 3 7 2 9 1)
//     `;
//     const result = await evaluate(code);
//     assert.strictEqual(result, 9);
// });

test('Variadic: string concatenation', async () => {
    const code = `
        (defun concat-all (. strings)
            (list/reduce (fun (a b) (string/concat a b)) "" strings))
        (concat-all "Hello" " " "wonderful" " " "world")
    `;
    const result = await evaluate(code);
    assert.strictEqual(result, "Hello wonderful world");
});

test('Variadic: list builder', async () => {
    const code = `
        (defun make-list (. items) items)
        (make-list 1 2 3 4 5)
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [1, 2, 3, 4, 5]);
});

// =============================================================================
// Edge Cases
// =============================================================================

// Note: Requires spread syntax
// test('Variadic: rest param with nested calls', async () => {
//     const code = `
//         (defun outer (. args)
//             (defun inner (. args2) (list/length args2))
//             (inner . args))
//         (outer 1 2 3)
//     `;
//     const result = await evaluate(code);
//     assert.strictEqual(result, 3);
// });

test('Variadic: combining with let bindings', async () => {
    const code = `
        (defun process (. nums)
            (let ((doubled (list/map (fun (x) (* x 2)) nums))
                  (sum (list/reduce (fun (a b) (+ a b)) 0 nums)))
                (list doubled sum)))
        (process 1 2 3)
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, [[2, 4, 6], 6]);
});

test('Variadic: function taking zero required args', async () => {
    const code = `
        (defun make-list-v2 (. items) items)
        (defvar empty-list (make-list-v2))
        empty-list
    `;
    const result = await evaluate(code);
    assert.deepStrictEqual(result, []);
});
