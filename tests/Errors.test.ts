import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Tokenizer.js';
import { Parser } from '../src/Parser.js';
import { Compiler } from '../src/Compiler.js';
import { Interpreter } from '../src/Interpreter.js';
import { CompilerOutput, isPipelineError, Token, ASTNode } from '../src/Types.js';

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

test('Compiler yields error for invalid def syntax', async () => {
  async function* mockAsyncGen(items: ASTNode[]) { for (const i of items) yield i; }
  const compiler = new Compiler();
  const asts: ASTNode[] = [
    {
      type: 'LIST',
      elements: [
        { type: 'SYMBOL', name: 'def' },
        { type: 'SYMBOL', name: 'foo' }
      ]
    }
  ];
  const gen = compiler.run(mockAsyncGen(asts));
  const results = [];
  for await (const output of gen) results.push(output);
  assert(results.some(isPipelineError), 'Should yield a PipelineError');
  assert(results.find(isPipelineError)?.stage === 'Compiler');
});

test('Interpreter yields error for undefined symbol', async () => {
  async function* mockAsyncGen(items: CompilerOutput[]) { for (const i of items) yield i; }
  const interpreter = new Interpreter();
  const outputs: CompilerOutput[] = [
    {
      type: 'EXPRESSION',
      ast: { type: 'SYMBOL', name: 'not_defined' }
    }
  ];
  const gen = interpreter.run(mockAsyncGen(outputs));
  let errorFound = false;
  for await (const result of gen) {
    if (isPipelineError(result.value) && result.value.stage === 'Interpreter') errorFound = true;
  }
  assert(errorFound, 'Should yield a PipelineError from Interpreter');
});
