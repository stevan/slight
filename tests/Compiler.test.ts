import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Compiler } from '../src/Compiler.js';
import { isPipelineError } from '../src/PipelineError.js';
import type { ASTNode } from '../src/Parser.js';
import type { CompilerOutput } from '../src/Compiler.js';

test('compiles a simple AST into CompilerOutput', async () => {
  async function* mockAsyncGen(items: ASTNode[]) { for (const i of items) yield i; }
  const compiler = new Compiler();
  const asts: ASTNode[] = [
    {
      type: 'LIST',
      elements: [
        { type: 'SYMBOL', name: '+' },
        { type: 'NUMBER', value: 1 },
        { type: 'NUMBER', value: 2 }
      ]
    }
  ];
  const gen = compiler.run(mockAsyncGen(asts));
  const outputs: CompilerOutput[] = [];
  for await (const output of gen) {
    if (!isPipelineError(output)) outputs.push(output);
  }
  assert.deepStrictEqual(outputs, [
    {
      type: 'EXPRESSION',
      ast: {
        type: 'LIST',
        elements: [
          { type: 'SYMBOL', name: '+' },
          { type: 'NUMBER', value: 1 },
          { type: 'NUMBER', value: 2 }
        ]
      }
    }
  ]);
});

test('compiles a cond expression AST into a COND node', async () => {
  async function* mockAsyncGen(items: ASTNode[]) { for (const i of items) yield i; }
  const compiler = new Compiler();
  const asts: ASTNode[] = [
    {
      type: 'LIST',
      elements: [
        { type: 'SYMBOL', name: 'cond' },
        {
          type: 'LIST',
          elements: [
            { type: 'SYMBOL', name: 'a' },
            { type: 'NUMBER', value: 1 }
          ]
        },
        {
          type: 'LIST',
          elements: [
            { type: 'SYMBOL', name: 'b' },
            { type: 'NUMBER', value: 2 }
          ]
        },
        {
          type: 'LIST',
          elements: [
            { type: 'SYMBOL', name: 'else' },
            { type: 'NUMBER', value: 3 }
          ]
        }
      ]
    }
  ];
  const gen = compiler.run(mockAsyncGen(asts));
  const outputs: CompilerOutput[] = [];
  for await (const output of gen) {
    if (!isPipelineError(output)) outputs.push(output);
  }
  assert.deepStrictEqual(outputs, [
    {
      type: 'EXPRESSION',
      ast: {
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
    }
  ]);
});

test('compiles a function definition with cond body into a COND node', async () => {
  async function* mockAsyncGen(items: ASTNode[]) { for (const i of items) yield i; }
  const compiler = new Compiler();
  const asts: ASTNode[] = [
    {
      type: 'LIST',
      elements: [
        { type: 'SYMBOL', name: 'def' },
        { type: 'SYMBOL', name: 'f' },
        { type: 'LIST', elements: [{ type: 'SYMBOL', name: 'x' }] },
        {
          type: 'LIST',
          elements: [
            { type: 'SYMBOL', name: 'cond' },
            {
              type: 'LIST',
              elements: [
                { type: 'SYMBOL', name: 'a' },
                { type: 'NUMBER', value: 1 }
              ]
            },
            {
              type: 'LIST',
              elements: [
                { type: 'SYMBOL', name: 'else' },
                { type: 'NUMBER', value: 2 }
              ]
            }
          ]
        }
      ]
    }
  ];
  const gen = compiler.run(mockAsyncGen(asts));
  const outputs: CompilerOutput[] = [];
  for await (const output of gen) {
    if (!isPipelineError(output)) outputs.push(output);
  }
  assert.deepStrictEqual(outputs, [
    {
      type: 'FUNCTION_DEF',
      name: 'f',
      params: ['x'],
      body: {
        type: 'COND',
        clauses: [
          {
            test: { type: 'SYMBOL', name: 'a' },
            result: { type: 'NUMBER', value: 1 }
          }
        ],
        elseClause: { type: 'NUMBER', value: 2 }
      }
    }
  ]);
});
