import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { isPipelineError, Token, ASTNode } from '../src/Slight/Types.js';

test('Tokenizer yields error for invalid token @', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const input = ['@'];
  const gen = tokenizer.run(mockAsyncGen(input));
  const results = [];
  for await (const token of gen) results.push(token);
  assert(results.some(isPipelineError), 'Should yield a PipelineError');
  assert(results.find(isPipelineError)?.stage === 'Tokenizer');
});

test('Tokenizer yields error for symbol starting with a number', async () => {
  async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
  const tokenizer = new Tokenizer();
  const input = ['1foo'];
  const gen = tokenizer.run(mockAsyncGen(input));
  const results = [];
  for await (const token of gen) results.push(token);
  assert(results.some(isPipelineError), 'Should yield a PipelineError');
  assert(results.find(isPipelineError)?.stage === 'Tokenizer');
});

test('Parser yields error for unmatched parenthesis', async () => {
  async function* mockAsyncGen(items: Token[]) { for (const i of items) yield i; }
  const parser = new Parser();
  const tokens: Token[] = [
    { type: 'LPAREN', source: '(', sequence_id: 1 },
    { type: 'NUMBER', source: '1', sequence_id: 2 }
  ];
  const gen = parser.run(mockAsyncGen(tokens));
  const results = [];
  for await (const ast of gen) results.push(ast);
  assert(results.some(isPipelineError), 'Should yield a PipelineError');
  assert(results.find(isPipelineError)?.stage === 'Parser');
});

test('Parser yields error for invalid def syntax', async () => {
  async function* mockAsyncGen(items: Token[]) { for (const i of items) yield i; }
  const parser = new Parser();
  // Tokens for (def foo) -- missing params and body
  const tokens: Token[] = [
    { type: 'LPAREN', source: '(', sequence_id: 1 },
    { type: 'SYMBOL', source: 'def', sequence_id: 2 },
    { type: 'SYMBOL', source: 'foo', sequence_id: 3 },
    { type: 'RPAREN', source: ')', sequence_id: 4 }
  ];
  const gen = parser.run(mockAsyncGen(tokens));
  const results = [];
  for await (const output of gen) results.push(output);
  assert(results.some(isPipelineError), 'Should yield a PipelineError');
  assert(results.find(isPipelineError)?.stage === 'Parser');
});

test('Interpreter yields error for undefined symbol', async () => {
  async function* mockAsyncGen(items: ASTNode[]) { for (const i of items) yield i; }
  const interpreter = new Interpreter();
  const outputs: ASTNode[] = [
    { type: 'SYMBOL', name: 'not_defined' }
  ];
  const gen = interpreter.run(mockAsyncGen(outputs));
  let errorFound = false;
  for await (const result of gen) {
    if (isPipelineError(result.value) && result.value.stage === 'Interpreter') errorFound = true;
  }
  assert(errorFound, 'Should yield a PipelineError from Interpreter');
});
