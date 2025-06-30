import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Parser } from '../src/Slight/Parser.js';
import { Token, PipelineError, isPipelineError } from '../src/Slight/Types.js';

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

test('parses a cond expression into AST', async () => {
  async function* mockAsyncGen(items: Token[]) { for (const i of items) yield i; }
  const parser = new Parser();
  const tokens: Token[] = [
    { type: 'LPAREN', source: '(', sequence_id: 1 },
    { type: 'SYMBOL', source: 'cond', sequence_id: 2 },
    { type: 'LPAREN', source: '(', sequence_id: 3 },
    { type: 'SYMBOL', source: 'a', sequence_id: 4 },
    { type: 'NUMBER', source: '1', sequence_id: 5 },
    { type: 'RPAREN', source: ')', sequence_id: 6 },
    { type: 'LPAREN', source: '(', sequence_id: 7 },
    { type: 'SYMBOL', source: 'b', sequence_id: 8 },
    { type: 'NUMBER', source: '2', sequence_id: 9 },
    { type: 'RPAREN', source: ')', sequence_id: 10 },
    { type: 'LPAREN', source: '(', sequence_id: 11 },
    { type: 'SYMBOL', source: 'else', sequence_id: 12 },
    { type: 'NUMBER', source: '3', sequence_id: 13 },
    { type: 'RPAREN', source: ')', sequence_id: 14 },
    { type: 'RPAREN', source: ')', sequence_id: 15 }
  ];
  const gen = parser.run(mockAsyncGen(tokens));
  const asts = [];
  for await (const ast of gen) asts.push(ast);
  assert.deepStrictEqual(asts, [
    {
        type: 'COND',
        clauses: [
          {
            test: { type: 'SYMBOL', name: 'a' },
            result: { type: 'NUMBER', value: 1 }
          },
          {
            test: { type: 'SYMBOL', name: 'b' },
            result: { type: 'NUMBER', value: 2 }
          }
        ],
        elseClause: { type: 'NUMBER', value: 3 }
    }
  ]);
});
