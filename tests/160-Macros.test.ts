import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { astToPlainObject } from './utils/astToPlainObject.js';

test('defmacro defines a simple macro', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro when (test body) (list (quote cond) (list test body)))'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true]);
});

test('macro expands simple when macro', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro when (test body) (list (quote cond) (list test body)))',
    '(when (> 5 3) 42)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true, 42]);
});

test('macro expands when with false condition', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro when (test body) (list (quote cond) (list test body)))',
    '(when (< 5 3) 42)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true, false]);
});

test('macro expands unless macro', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro unless (test body) (list (quote cond) (list (list (quote not) test) body)))',
    '(unless (< 5 3) 99)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true, 99]);
});

test('macro with multiple uses', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro when (test body) (list (quote cond) (list test body)))',
    '(when (> 5 3) 10)',
    '(when (> 2 1) 20)',
    '(when (< 5 3) 30)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true, 10, 20, false]);
});

test('macro expands with quoted symbols', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro make-list (a b) (list (quote list) a b))',
    '(make-list 1 2)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true, [1, 2]]);
});

test('macro works with function definitions', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro when (test body) (list (quote cond) (list test body)))',
    '(defun check (x) (when (> x 10) 100))',
    '(check 15)',
    '(check 5)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true, true, 100, false]);
});

test('macro with nested expressions', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro when (test body) (list (quote cond) (list test body)))',
    '(when (> 5 3) (+ 10 20 30))'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true, 60]);
});

test('macro that creates arithmetic operations', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro add2 (x) (list (quote +) x 2))',
    '(add2 5)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true, 7]);
});

test('macro expands within let bindings', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro add2 (x) (list (quote +) x 2))',
    '(let ((x 10)) (add2 x))'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true, 12]);
});

test('macro with three parameters', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const macroExpander = new MacroExpander();
  const interpreter = new Interpreter();

  const input = [
    '(defmacro add3 (a b c) (list (quote +) a b c))',
    '(add3 1 2 3)'
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const expandedAsts = macroExpander.run(asts);
  const results = [];
  for await (const result of interpreter.run(expandedAsts)) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [true, 6]);
});
