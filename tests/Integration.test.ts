import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer, Parser, Compiler, Interpreter } from '../src/ML.js';

test('full pipeline evaluates a simple expression', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const compiler = new Compiler();
  const interpreter = new Interpreter();

  const input = ['(+ 1 2)'];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const compiled = compiler.run(asts);
  const results = [];
  for await (const result of interpreter.run(compiled)) results.push(result);
  assert.deepStrictEqual(results, [3]);
});

test('full pipeline evaluates function definition and call', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const compiler = new Compiler();
  const interpreter = new Interpreter();

  const input = [
    '(def adder (x y) (+ x y))',
    '(adder 1 2)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const compiled = compiler.run(asts);
  const results = [];
  for await (const result of interpreter.run(compiled)) results.push(result);
  assert.deepStrictEqual(results, [true, 3]);
});

test('full pipeline evaluates recursive factorial function', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const compiler = new Compiler();
  const interpreter = new Interpreter();

  const input = [
    '(def factorial (n) (cond ((== n 0) 1) (else (* n (factorial (- n 1))))))',
    '(factorial 5)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const compiled = compiler.run(asts);
  const results = [];
  for await (const result of interpreter.run(compiled)) results.push(result);
  assert.deepStrictEqual(results, [true, 120]);
});

test('full pipeline evaluates arithmetic builtins', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const compiler = new Compiler();
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
  const compiled = compiler.run(asts);
  const results = [];
  for await (const result of interpreter.run(compiled)) results.push(result);
  assert.deepStrictEqual(results, [6, 5, 24, 4, 2, -5]);
});

test('full pipeline evaluates comparison builtins', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const compiler = new Compiler();
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
  const compiled = compiler.run(asts);
  const results = [];
  for await (const result of interpreter.run(compiled)) results.push(result);
  assert.deepStrictEqual(results, [true, false, true, false, true, false, true, false, true, true, false, true, true, false]);
});

test('full pipeline evaluates list builtins', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const compiler = new Compiler();
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
  const compiled = compiler.run(asts);
  const results = [];
  for await (const result of interpreter.run(compiled)) results.push(result);
  assert.deepStrictEqual(results, [
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
  const compiler = new Compiler();
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
  const compiled = compiler.run(asts);
  const results = [];
  for await (const result of interpreter.run(compiled)) results.push(result);
  assert.deepStrictEqual(results, [true, false, false, true, false, true, true, false]);
});
