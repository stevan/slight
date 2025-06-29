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
