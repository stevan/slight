import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Parser } from '../src/ML.js';
import type { Token } from '../src/ML.js';

test('parses a simple token list into AST', async () => {
  async function* mockAsyncGen(items: Token[]) { for (const i of items) yield i; }
  const parser = new Parser();
  const tokens: Token[] = [
    { type: 'LPAREN', source: '(', sequence_id: 1 },
    { type: 'SYMBOL', source: '+', sequence_id: 2 },
    { type: 'NUMBER', source: '1', sequence_id: 3 },
    { type: 'NUMBER', source: '2', sequence_id: 4 },
    { type: 'RPAREN', source: ')', sequence_id: 5 }
  ];
  const gen = parser.run(mockAsyncGen(tokens));
  const asts = [];
  for await (const ast of gen) asts.push(ast);
  assert.deepStrictEqual(asts, [
    {
      type: 'LIST',
      elements: [
        { type: 'SYMBOL', name: '+' },
        { type: 'NUMBER', value: 1 },
        { type: 'NUMBER', value: 2 }
      ]
    }
  ]);
});
