import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { astToPlainObject } from './utils/astToPlainObject.js';
import { CallNode, SymbolNode, NumberNode } from '../src/Slight/AST.js';

test('interprets a simple addition expression', async () => {
  async function* mockAsyncGen(items: any[]) { for (const i of items) yield i; }
  const interpreter = new Interpreter();
  const outputs = [
    new CallNode([
      new SymbolNode('+'),
      new NumberNode(1),
      new NumberNode(2)
    ])
  ];
  const gen = interpreter.run(mockAsyncGen(outputs));
  const results = [];
  for await (const result of gen) results.push(result);
  assert.deepStrictEqual(results.map(x => astToPlainObject(x.value)), [3]);
});
