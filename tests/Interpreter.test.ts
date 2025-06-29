import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Interpreter } from '../src/Interpreter.js';
import type { CompilerOutput } from '../src/Compiler.js';

test('interprets a simple addition expression', async () => {
  async function* mockAsyncGen(items: CompilerOutput[]) { for (const i of items) yield i; }
  const interpreter = new Interpreter();
  const outputs: CompilerOutput[] = [
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
  ];
  const gen = interpreter.run(mockAsyncGen(outputs));
  const results = [];
  for await (const result of gen) results.push(result);
  assert.deepStrictEqual(results, [3]);
});
