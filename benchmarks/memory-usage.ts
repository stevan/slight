/**
 * Memory usage benchmark for async generator pipeline
 *
 * Measures memory consumption and GC behavior of the pipeline
 *
 * Run with: tsc && node --expose-gc js/benchmarks/memory-usage.js
 */

import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';

async function* stringSource(code: string) {
    yield code;
}

function getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
        heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2),
        rss: (usage.rss / 1024 / 1024).toFixed(2),
        external: (usage.external / 1024 / 1024).toFixed(2),
    };
}

function forceGC() {
    if (global.gc) {
        global.gc();
    } else {
        console.warn('Run with --expose-gc to enable manual garbage collection');
    }
}

async function measureMemory(name: string, fn: () => Promise<void>) {
    forceGC();
    const before = getMemoryUsage();

    await fn();

    forceGC();
    const after = getMemoryUsage();

    const heapDiff = (parseFloat(after.heapUsed) - parseFloat(before.heapUsed)).toFixed(2);

    console.log(`\n${name}:`);
    console.log(`  Before: ${before.heapUsed} MB heap, ${before.rss} MB RSS`);
    console.log(`  After:  ${after.heapUsed} MB heap, ${after.rss} MB RSS`);
    console.log(`  Diff:   ${heapDiff} MB`);
}

async function fullPipeline(code: string, iterations: number): Promise<void> {
    for (let i = 0; i < iterations; i++) {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();
        const interpreter = new Interpreter();

        const tokens = tokenizer.run(stringSource(code));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);

        for await (const output of interpreter.run(expanded)) {
            // Consume output
        }
    }
}

async function reuseInterpreter(code: string, iterations: number): Promise<void> {
    const interpreter = new Interpreter();

    for (let i = 0; i < iterations; i++) {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const macroExpander = new MacroExpander();

        const tokens = tokenizer.run(stringSource(code));
        const asts = parser.run(tokens);
        const expanded = macroExpander.run(asts);

        for await (const output of interpreter.run(expanded)) {
            // Consume output
        }
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('MEMORY USAGE BENCHMARK');
    console.log('='.repeat(60));

    const ITERATIONS = 100;
    const SIMPLE_CODE = '(+ 1 2)';
    const COMPLEX_CODE = `
        (def factorial (n)
            (cond
                ((< n 2) 1)
                (true (* n (factorial (- n 1))))))
        (factorial 10)
    `;

    console.log(`\nRunning ${ITERATIONS} iterations of each test...\n`);

    // Test 1: Simple expression, new interpreter each time
    await measureMemory(
        `Simple expression (${ITERATIONS}x, new interpreter)`,
        () => fullPipeline(SIMPLE_CODE, ITERATIONS)
    );

    // Test 2: Simple expression, reuse interpreter
    await measureMemory(
        `Simple expression (${ITERATIONS}x, reused interpreter)`,
        () => reuseInterpreter(SIMPLE_CODE, ITERATIONS)
    );

    // Test 3: Complex code, new interpreter each time
    await measureMemory(
        `Complex code (${ITERATIONS}x, new interpreter)`,
        () => fullPipeline(COMPLEX_CODE, ITERATIONS)
    );

    // Test 4: Complex code, reuse interpreter
    await measureMemory(
        `Complex code (${ITERATIONS}x, reused interpreter)`,
        () => reuseInterpreter(COMPLEX_CODE, ITERATIONS)
    );

    // Test 5: Accumulated allocations without GC
    console.log('\n\nTesting allocation patterns (no GC between iterations):');
    const beforeAlloc = getMemoryUsage();

    for (let i = 0; i < 1000; i++) {
        await fullPipeline(SIMPLE_CODE, 1);
        if (i % 100 === 0) {
            const current = getMemoryUsage();
            console.log(`  After ${i} iterations: ${current.heapUsed} MB heap`);
        }
    }

    const afterAlloc = getMemoryUsage();
    console.log(`  Final: ${afterAlloc.heapUsed} MB heap (started at ${beforeAlloc.heapUsed} MB)`);

    console.log('\n' + '='.repeat(60));
    console.log('RECOMMENDATIONS:');
    console.log('='.repeat(60));
    console.log('- Reuse interpreter instances when possible to reduce allocations');
    console.log('- Monitor heap growth for memory leaks');
    console.log('- Use --trace-gc to see GC activity: node --trace-gc --expose-gc script.js');
    console.log('- Generate heap snapshots: node --heap-prof script.js');
    console.log('- Profile allocations with Chrome DevTools or clinic.js');
    console.log('');
}

main().catch(console.error);
