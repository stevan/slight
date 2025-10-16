import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { isPipelineError, Token } from '../src/Slight/Types.js';
import { ASTNode, NumberNode, StringNode, BooleanNode, SymbolNode, CallNode, QuoteNode, CondNode, DefNode } from '../src/Slight/AST.js';

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
    new SymbolNode('not_defined')
  ];
  const gen = interpreter.run(mockAsyncGen(outputs));
  let errorFound = false;
  for await (const result of gen) {
    if (isPipelineError(result.value) && result.value.stage === 'Interpreter') errorFound = true;
  }
  assert(errorFound, 'Should yield a PipelineError from Interpreter');
});

test('Parser yields error for let with invalid binding format', async () => {
  async function* mockAsyncGen(items: Token[]) { for (const i of items) yield i; }
  const parser = new Parser();
  // Tokens for (let x 5 body) -- missing parentheses around bindings
  const tokens: Token[] = [
    { type: 'LPAREN', source: '(', sequence_id: 1 },
    { type: 'SYMBOL', source: 'let', sequence_id: 2 },
    { type: 'SYMBOL', source: 'x', sequence_id: 3 },
    { type: 'NUMBER', source: '5', sequence_id: 4 },
    { type: 'SYMBOL', source: 'x', sequence_id: 5 },
    { type: 'RPAREN', source: ')', sequence_id: 6 }
  ];
  const gen = parser.run(mockAsyncGen(tokens));
  const results = [];
  for await (const output of gen) results.push(output);
  assert(results.some(isPipelineError), 'Should yield a PipelineError');
  const error = results.find(isPipelineError);
  assert(error?.stage === 'Parser');
  assert(error?.message.includes('Invalid let syntax'), 'Error should mention invalid let syntax');
});

test('Parser yields error for let with too few arguments', async () => {
  async function* mockAsyncGen(items: Token[]) { for (const i of items) yield i; }
  const parser = new Parser();
  // Tokens for (let ((x 5))) -- missing body
  const tokens: Token[] = [
    { type: 'LPAREN', source: '(', sequence_id: 1 },
    { type: 'SYMBOL', source: 'let', sequence_id: 2 },
    { type: 'LPAREN', source: '(', sequence_id: 3 },
    { type: 'LPAREN', source: '(', sequence_id: 4 },
    { type: 'SYMBOL', source: 'x', sequence_id: 5 },
    { type: 'NUMBER', source: '5', sequence_id: 6 },
    { type: 'RPAREN', source: ')', sequence_id: 7 },
    { type: 'RPAREN', source: ')', sequence_id: 8 },
    { type: 'RPAREN', source: ')', sequence_id: 9 }
  ];
  const gen = parser.run(mockAsyncGen(tokens));
  const results = [];
  for await (const output of gen) results.push(output);
  assert(results.some(isPipelineError), 'Should yield a PipelineError');
  const error = results.find(isPipelineError);
  assert(error?.stage === 'Parser');
  assert(error?.message.includes('Invalid let syntax'), 'Error should mention invalid let syntax');
});

test('Parser yields error for let binding with wrong number of elements', async () => {
  async function* mockAsyncGen(items: Token[]) { for (const i of items) yield i; }
  const parser = new Parser();
  // Tokens for (let ((x)) body) -- binding has only 1 element
  const tokens: Token[] = [
    { type: 'LPAREN', source: '(', sequence_id: 1 },
    { type: 'SYMBOL', source: 'let', sequence_id: 2 },
    { type: 'LPAREN', source: '(', sequence_id: 3 },
    { type: 'LPAREN', source: '(', sequence_id: 4 },
    { type: 'SYMBOL', source: 'x', sequence_id: 5 },
    { type: 'RPAREN', source: ')', sequence_id: 6 },
    { type: 'RPAREN', source: ')', sequence_id: 7 },
    { type: 'NUMBER', source: '42', sequence_id: 8 },
    { type: 'RPAREN', source: ')', sequence_id: 9 }
  ];
  const gen = parser.run(mockAsyncGen(tokens));
  const results = [];
  for await (const output of gen) results.push(output);
  assert(results.some(isPipelineError), 'Should yield a PipelineError');
  const error = results.find(isPipelineError);
  assert(error?.stage === 'Parser');
  assert(error?.message.includes('each binding must be (name value)'), 'Error should mention binding format');
});
