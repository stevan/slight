import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Tokenizer.js';
import { Parser } from '../src/Parser.js';
import { Compiler } from '../src/Compiler.js';
import { Interpreter } from '../src/Interpreter.js';

test('full pipeline evaluates mutually recursive and nested function calls', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const compiler = new Compiler();
  const interpreter = new Interpreter();

  const input = [
    // even? and odd? are mutually recursive
    '(def even? (n) (cond ((== n 0) true) (else (odd? (- n 1)))))',
    '(def odd? (n) (cond ((== n 0) false) (else (even? (- n 1)))))',
    // sum-to-n uses even? and odd?
    '(def sum-to-n (n) (cond ((== n 0) 0) ((even? n) (+ n (sum-to-n (- n 1)))) (else (sum-to-n (- n 1)))))',
    // test cases
    '(even? 10)',
    '(odd? 10)',
    '(even? 7)',
    '(odd? 7)',
    '(sum-to-n 5)', // should sum only even numbers: 2 + 4 = 6
    '(sum-to-n 10)' // 2 + 4 + 6 + 8 + 10 = 30
  ];
  const tokens = tokenizer.run(mockAsyncGen(input));
  const asts = parser.run(tokens);
  const compiled = compiler.run(asts);
  const results = [];
  for await (const result of interpreter.run(compiled)) results.push(result);
  assert.deepStrictEqual(results.map((x) => x.value), [true, true, true, true, false, false, true, 6, 30]);
});
