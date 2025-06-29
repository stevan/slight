import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Compiler, isPipelineError } from '../src/ML.js';
import type { ASTNode, CompilerOutput } from '../src/ML.js';

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
