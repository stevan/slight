import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { Interpreter } from '../src/Slight/Interpreter.js';

test('full pipeline evaluates a simple expression', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = ['(+ 1 2)'];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [3]);
});

test('full pipeline evaluates function definition and call', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    '(def adder (x y) (+ x y))',
    '(adder 1 2)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [true, 3]);
});

test('full pipeline evaluates recursive factorial function', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    '(def factorial (n) (cond ((== n 0) 1) (else (* n (factorial (- n 1))))))',
    '(factorial 5)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [true, 120]);
});

test('full pipeline evaluates arithmetic builtins', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    '(+ 1 2 3)',
    '(- 10 4 1)',
    '(* 2 3 4)',
    '(/ 20 5)',
    '(mod 17 5)',
    '(- 5)', // unary minus
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [6, 5, 24, 4, 2, -5]);
});

test('full pipeline evaluates comparison builtins', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    '(== 1 1)',
    '(== 1 2)',
    '(!= 1 2)',
    '(!= 2 2)',
    '(< 1 2)',
    '(< 2 1)',
    '(> 2 1)',
    '(> 1 2)',
    '(<= 2 2)',
    '(<= 1 2)',
    '(<= 2 1)',
    '(>= 2 2)',
    '(>= 2 1)',
    '(>= 1 2)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [true, false, true, false, true, false, true, false, true, true, false, true, true, false]);
});

test('full pipeline evaluates list builtins', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    '(list 1 2 3)',
    '(head (list 1 2 3))',
    '(tail (list 1 2 3))',
    '(cons 0 (list 1 2 3))',
    '(empty? (list))',
    '(empty? (list 1))'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [
    [1, 2, 3],
    1,
    [2, 3],
    [0, 1, 2, 3],
    true,
    false
  ]);
});

test('full pipeline evaluates logical builtins', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    '(and true true)',
    '(and true false)',
    '(or false false)',
    '(or true false)',
    '(not true)',
    '(not false)',
    '(and)', // should be true (vacuously true)
    '(or)',  // should be false (vacuously false)
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [true, false, false, true, false, true, true, false]);
});

test('full pipeline evaluates quoting', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    "(quote (1 2 3))",
    "(quote foo)",
    "(quote (a (b c)))"
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [
    [1, 2, 3],
    'foo',
    ['a', ['b', 'c']]
  ]);
});

test('full pipeline evaluates recursive sum-list', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    '(def sum-list (lst) (cond ((empty? lst) 0) (else (+ (head lst) (sum-list (tail lst))))))',
    '(sum-list (list 1 2 3 4 5))'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [true, 15]);
});

test('full pipeline evaluates complex cond', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    '(cond ((== 1 2) 100) ((== 2 2) 200) (else 300))',
    '(cond ((== 1 2) 100) ((== 2 3) 200) (else 300))'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [200, 300]);
});

test('full pipeline evaluates boolean logic chains', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    '(and true true true true)',
    '(and true false true)',
    '(or false false false true)',
    '(or false false false false)',
    '(or true (and false false) true)',
    '(and (or false true) (not false))'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [true, false, true, false, true, true]);
});

test('full pipeline evaluates string handling', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();

  const input = [
    '(list "a" "b" "c")',
    '(head (list "foo" "bar"))',
    '(quote "baz")'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const results = [];
  for await (const result of interpreter.run(asts)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [["a", "b", "c"], "foo", "baz"]);
});
