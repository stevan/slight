import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { astToPlainObject } from './utils/astToPlainObject.js';

async function evaluate(code: string[]): Promise<any[]> {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }

    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(mockAsyncGen(code));
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);

    const results: any[] = [];
    for await (const result of interpreter.run(expanded)) {
        if (process.env['DEBUG']) {
            console.log('[TEST] Got result:', result);
        }
        results.push(result.value);
    }

    if (process.env['DEBUG']) {
        console.log('[TEST] results before astToPlainObject:', results);
    }
    const plainResults = results.map(x => astToPlainObject(x));
    if (process.env['DEBUG']) {
        console.log('[TEST] results after astToPlainObject:', plainResults);
    }
    return plainResults;
}

test('spawn creates a new process', async () => {
    const results = await evaluate([
        '(defvar pid (spawn "(+ 1 2)"))',
        'pid'
    ]);
    if (process.env['DEBUG']) {
        console.log('[TEST] Final results:', results);
        console.log('[TEST] typeof results[0]:', typeof results[0]);
        console.log('[TEST] typeof results[1]:', typeof results[1]);
    }
    assert.equal(typeof results[0], 'boolean'); // def returns true
    assert.equal(typeof results[1], 'number');  // pid is a number
    assert.ok(results[1] > 0);                  // pid is positive
});
