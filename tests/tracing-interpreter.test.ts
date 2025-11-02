import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TracingInterpreter } from '../src/Slight/TracingInterpreter.js';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { isPipelineError } from '../src/Slight/Types.js';

/**
 * Helper function to evaluate Slight code with a given interpreter
 */
async function evaluate(interpreter: TracingInterpreter, code: string): Promise<any> {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();

    async function* stringSource() {
        yield code;
    }

    const tokens = tokenizer.run(stringSource());
    const ast = parser.run(tokens);
    const expanded = macroExpander.run(ast);

    let lastResult: any = null;
    for await (const node of expanded) {
        if (isPipelineError(node)) {
            throw new Error(`Pipeline error: ${node.message}`);
        }
        lastResult = await node.evaluate(interpreter, new Map());
    }

    return lastResult;
}

test('TracingInterpreter - Basic call tracing', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    const result = await evaluate(interp, '(+ 1 2 3)');

    assert.equal(result, 6);

    const trace = interp.getTraceLog();
    assert.equal(trace.length, 1);
    assert.ok(trace[0].expr.includes('(+'));
    assert.ok(trace[0].expr.includes('1'));
    assert.ok(trace[0].expr.includes('2'));
    assert.ok(trace[0].expr.includes('3'));
    assert.equal(trace[0].result, 6);
});

test('TracingInterpreter - Depth tracking with nested calls', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    // Use list/map which calls builtins during its execution
    await evaluate(interp, '(list/map (fun (x) (* x 2)) (list 1 2 3))');

    const trace = interp.getTraceLog();

    // Should have calls at different depths
    const depths = trace.map(e => e.depth);
    const uniqueDepths = [...new Set(depths)];

    // Should have at least 2 different depth levels
    assert.ok(uniqueDepths.length >= 2);

    // Some calls should be deeper than others
    const maxDepth = Math.max(...depths);
    const minDepth = Math.min(...depths);
    assert.ok(maxDepth > minDepth);
});

test('TracingInterpreter - Result capture can be disabled', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: false
    });

    await evaluate(interp, '(+ 1 2)');

    const trace = interp.getTraceLog();
    assert.equal(trace.length, 1);
    assert.equal(trace[0].result, undefined);
});

test('TracingInterpreter - Successful calls have no errors', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    await evaluate(interp, '(+ 1 2)');
    await evaluate(interp, '(* 3 4)');

    const trace = interp.getTraceLog();
    assert.ok(trace.length > 0);

    // None of the entries should have errors
    const errorEntries = trace.filter(e => e.error);
    assert.equal(errorEntries.length, 0);
});

test('TracingInterpreter - Timing information', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true,
        includeTimings: true
    });

    await evaluate(interp, '(+ 1 2)');

    const trace = interp.getTraceLog();
    assert.equal(trace.length, 1);
    assert.ok(trace[0].duration !== undefined);
    assert.ok(trace[0].duration >= 0);
});

test('TracingInterpreter - Timing can be disabled', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true,
        includeTimings: false
    });

    await evaluate(interp, '(+ 1 2)');

    const trace = interp.getTraceLog();
    assert.equal(trace.length, 1);
    assert.equal(trace[0].duration, undefined);
});

test('TracingInterpreter - Max depth limiting', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true,
        maxDepth: 1
    });

    // Use list/map which would normally create depth 2 calls
    await evaluate(interp, '(list/map (fun (x) (* x 2)) (list 1 2))');

    const trace = interp.getTraceLog();

    // Should only trace depth 1 calls (list and list/map), not the * calls inside map
    const allAtDepth1 = trace.every(e => e.depth === 1);
    assert.ok(allAtDepth1);

    // Should have some calls (list, list/map) but not the nested * calls
    assert.ok(trace.length >= 2);
});

test('TracingInterpreter - Clear trace log', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    await evaluate(interp, '(+ 1 2)');
    assert.ok(interp.getTraceLog().length > 0);

    interp.clearTraceLog();
    assert.equal(interp.getTraceLog().length, 0);
});

test('TracingInterpreter - Statistics generation', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true,
        includeTimings: true
    });

    await evaluate(interp, '(+ 1 2)');
    await evaluate(interp, '(* 3 4)');
    await evaluate(interp, '(- 10 5)');

    const stats = interp.getTraceStats();

    assert.equal(stats.totalCalls, 3);
    assert.ok(stats.totalDuration >= 0);
    assert.equal(stats.errors, 0);
    assert.ok(stats.maxDepth > 0);
    assert.ok(stats.builtinCalls['+'] >= 1);
    assert.ok(stats.builtinCalls['*'] >= 1);
    assert.ok(stats.builtinCalls['-'] >= 1);
});

test('TracingInterpreter - Traces builtin calls in recursive functions', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    await evaluate(interp, `
        (def factorial (fun (n)
            (cond
                ((<= n 1) 1)
                (else (* n (factorial (- n 1)))))))
        (factorial 5)
    `);

    const trace = interp.getTraceLog();

    // Should have multiple builtin calls (<=, *, -)
    assert.ok(trace.length > 5);

    // Should have calls to <=, *, and -
    const ops = trace.map(e => {
        const match = e.expr.match(/^\(([^\s)]+)/);
        return match ? match[1] : '';
    });

    assert.ok(ops.includes('<='));
    assert.ok(ops.includes('*'));
    assert.ok(ops.includes('-'));
});

test('TracingInterpreter - Multiple interpreter instances are independent', async () => {
    const interp1 = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    const interp2 = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    await evaluate(interp1, '(+ 1 2)');
    await evaluate(interp2, '(* 3 4)');

    const trace1 = interp1.getTraceLog();
    const trace2 = interp2.getTraceLog();

    assert.equal(trace1.length, 1);
    assert.equal(trace2.length, 1);
    assert.ok(trace1[0].expr.includes('(+'));
    assert.ok(trace2[0].expr.includes('(*'));
});

test('TracingInterpreter - Export trace as JSON', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true,
        includeTimings: true
    });

    await evaluate(interp, '(+ 1 2)');

    const json = interp.exportTraceAsJSON();
    const parsed = JSON.parse(json);

    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 1);
    assert.ok(parsed[0].expr);
    assert.ok(parsed[0].depth);
    assert.ok(parsed[0].timestamp);
});

test('TracingInterpreter - Value formatting for different types', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    // Test various value types
    await evaluate(interp, '(list 1 2 3)');
    await evaluate(interp, '(string/concat "hello" " " "world")');
    await evaluate(interp, '(> 5 3)');

    const trace = interp.getTraceLog();

    // Verify we have entries for each call
    assert.ok(trace.length >= 3);

    // Results should be captured and formatted
    const listEntry = trace.find(e => e.expr.includes('(list'));
    assert.ok(listEntry);
    assert.ok(Array.isArray(listEntry.result));

    const stringEntry = trace.find(e => e.expr.includes('(string/concat'));
    assert.ok(stringEntry);
    assert.equal(typeof stringEntry.result, 'string');

    const boolEntry = trace.find(e => e.expr.includes('(>'));
    assert.ok(boolEntry);
    assert.equal(typeof boolEntry.result, 'boolean');
});

test('TracingInterpreter - Trace summary includes builtin counts', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    await evaluate(interp, '(+ 1 2)');
    await evaluate(interp, '(+ 3 4)');
    await evaluate(interp, '(* 5 6)');

    const stats = interp.getTraceStats();

    assert.equal(stats.builtinCalls['+'], 2);
    assert.equal(stats.builtinCalls['*'], 1);
});

test('TracingInterpreter - Complex nested expression', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    const result = await evaluate(interp, '(+ (* 2 3) (- 10 5))');

    assert.equal(result, 11);

    const trace = interp.getTraceLog();

    // Should have calls for +, *, and -
    const plusCall = trace.find(e => e.expr.includes('(+'));
    const mulCall = trace.find(e => e.expr.includes('(*'));
    const minusCall = trace.find(e => e.expr.includes('(-'));

    assert.ok(plusCall);
    assert.ok(mulCall);
    assert.ok(minusCall);

    // All three operations are traced
    assert.equal(trace.length, 3);

    // Results are correct
    assert.equal(mulCall.result, 6);
    assert.equal(minusCall.result, 5);
    assert.equal(plusCall.result, 11);
});
