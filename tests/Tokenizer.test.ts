import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Tokenizer.js';
import { PipelineError, isPipelineError } from '../src/PipelineError.js';

test('tokenizes a simple expression', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const input = ['(+ 1 2)'];
  const gen = tokenizer.run(mockAsyncGen(input));
  const tokens = [];
  for await (const token of gen) tokens.push(token);
  assert.deepStrictEqual(tokens, [
    { type: 'LPAREN', source: '(', sequence_id: 1 },
    { type: 'SYMBOL', source: '+', sequence_id: 2 },
    { type: 'NUMBER', source: '1', sequence_id: 3 },
    { type: 'NUMBER', source: '2', sequence_id: 4 },
    { type: 'RPAREN', source: ')', sequence_id: 5 }
  ]);
});
