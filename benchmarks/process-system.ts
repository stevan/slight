/**
 * Process system benchmark for Slight interpreter
 *
 * Measures:
 * 1. Process spawn overhead (with and without state cloning)
 * 2. State cloning cost with different state sizes
 * 3. Message passing throughput
 * 4. Concurrent process scaling (10, 100, 1000 processes)
 * 5. Memory usage of many processes
 *
 * Run with: tsc && node js/benchmarks/process-system.js
 * Memory profiling: tsc && node --expose-gc js/benchmarks/process-system.js
 */

import { performance } from 'node:perf_hooks';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { ProcessRuntime } from '../src/Slight/ProcessRuntime.js';

async function* stringSource(code: string) {
    yield code;
}

interface BenchmarkResult {
    name: string;
    avgTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
    throughput?: number;
}

function getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
        heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2),
        rss: (usage.rss / 1024 / 1024).toFixed(2),
    };
}

function forceGC() {
    if (global.gc) {
        global.gc();
    }
}

async function evaluate(code: string): Promise<any> {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(stringSource(code));
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);

    let result: any;
    for await (const output of interpreter.run(expanded)) {
        result = output.value;
    }
    return result;
}

async function benchmark(
    name: string,
    fn: () => Promise<void>,
    iterations: number,
    warmup: number = 10
): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < warmup; i++) {
        await fn();
    }

    // Reset runtime between warmup and actual benchmark
    ProcessRuntime.getInstance().reset();

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await fn();
        const end = performance.now();
        times.push(end - start);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return { name, avgTime, minTime, maxTime, totalTime };
}

// ============================================================================
// BENCHMARK 1: Basic Process Spawning
// ============================================================================

async function spawnSimpleProcess(): Promise<void> {
    const runtime = ProcessRuntime.getInstance();
    const pid = await runtime.spawn('(+ 1 2)');
    await runtime.wait(pid);
}

// Shared interpreters for state spawning benchmarks
let smallStateInterpreter: any;
let largeStateInterpreter: any;

async function setupSmallStateInterpreter(): Promise<void> {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    const code = `
        (def x 10)
        (def y 20)
        (def add (a b) (+ a b))
    `;
    const tokens = tokenizer.run(stringSource(code));
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);

    for await (const output of interpreter.run(expanded)) {
        // Consume output
    }

    smallStateInterpreter = interpreter;
}

async function setupLargeStateInterpreter(): Promise<void> {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    let code = '';
    for (let i = 0; i < 100; i++) {
        code += `(def var${i} ${i})\n`;
        code += `(def func${i} (x) (* x ${i}))\n`;
    }

    const tokens = tokenizer.run(stringSource(code));
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);

    for await (const output of interpreter.run(expanded)) {
        // Consume output
    }

    largeStateInterpreter = interpreter;
}

async function spawnWithSmallState(): Promise<void> {
    // Spawn from pre-configured interpreter with small state
    const code = '(spawn "(+ x y)")';
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();

    const tokens = tokenizer.run(stringSource(code));
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);

    for await (const output of smallStateInterpreter.run(expanded)) {
        // Consume output
    }
}

async function spawnWithLargeState(): Promise<void> {
    // Spawn from pre-configured interpreter with large state
    const code = '(spawn "(+ 1 2)")';
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();

    const tokens = tokenizer.run(stringSource(code));
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);

    for await (const output of largeStateInterpreter.run(expanded)) {
        // Consume output
    }
}

// ============================================================================
// BENCHMARK 2: Message Passing
// ============================================================================

async function singleMessagePassing(): Promise<void> {
    const runtime = ProcessRuntime.getInstance();

    // Spawn a worker that echoes messages
    const worker = await runtime.spawn(`
        (begin
            (def msg (recv))
            (send (list/head msg) (list/head (list/tail msg))))
    `);

    // Send message from main process (PID 0)
    runtime.send(0, worker, 42);

    // Receive response
    await runtime.recv(0);

    await runtime.wait(worker);
}

async function multipleMessages(count: number): Promise<void> {
    const runtime = ProcessRuntime.getInstance();

    const worker = await runtime.spawn(`
        (def loop (n)
            (cond
                ((> n 0)
                    (begin
                        (def msg (recv))
                        (send (list/head msg) (list/head (list/tail msg)))
                        (loop (- n 1))))
                (true null)))
        (loop ${count})
    `);

    for (let i = 0; i < count; i++) {
        runtime.send(0, worker, i);
        await runtime.recv(0);
    }

    await runtime.wait(worker);
}

// ============================================================================
// BENCHMARK 3: Concurrent Process Scaling
// ============================================================================

async function spawnManyProcesses(count: number): Promise<void> {
    const runtime = ProcessRuntime.getInstance();
    const pids: number[] = [];

    // Spawn all processes
    for (let i = 0; i < count; i++) {
        const pid = await runtime.spawn('(+ 1 2)');
        pids.push(pid);
    }

    // Wait for all to complete
    await Promise.all(pids.map(pid => runtime.wait(pid)));
}

async function concurrentComputation(count: number): Promise<void> {
    const runtime = ProcessRuntime.getInstance();
    const pids: number[] = [];

    // Spawn processes that do real work (fibonacci)
    for (let i = 0; i < count; i++) {
        const pid = await runtime.spawn(`
            (def fib (n)
                (cond
                    ((< n 2) n)
                    (true (+ (fib (- n 1)) (fib (- n 2))))))
            (fib 15)
        `);
        pids.push(pid);
    }

    // Wait for all to complete
    await Promise.all(pids.map(pid => runtime.wait(pid)));
}

async function messagePassingRing(size: number): Promise<void> {
    const runtime = ProcessRuntime.getInstance();
    const pids: number[] = [];

    // Create a ring of processes
    for (let i = 0; i < size; i++) {
        const nextIdx = (i + 1) % size;
        const pid = await runtime.spawn(`
            (def msg (recv))
            (send ${i === size - 1 ? 0 : 'next'} (list/head (list/tail msg)))
        `);
        pids.push(pid);
    }

    // Send initial message
    runtime.send(0, pids[0], 42);

    // Receive message after it goes around the ring
    await runtime.recv(0);

    // Wait for all processes
    await Promise.all(pids.map(pid => runtime.wait(pid)));
}

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

function printResults(results: BenchmarkResult[]) {
    console.log('\n' + '='.repeat(90));
    console.log('PROCESS SYSTEM BENCHMARK RESULTS');
    console.log('='.repeat(90));

    const maxNameLength = Math.max(...results.map(r => r.name.length));

    console.log('Benchmark'.padEnd(maxNameLength + 2) +
                'Avg (ms)'.padStart(12) +
                'Min (ms)'.padStart(12) +
                'Max (ms)'.padStart(12) +
                'Throughput'.padStart(15));
    console.log('-'.repeat(90));

    for (const result of results) {
        const throughput = result.throughput ?
            `${result.throughput.toFixed(0)} ops/s` :
            'N/A';

        console.log(
            result.name.padEnd(maxNameLength + 2) +
            result.avgTime.toFixed(4).padStart(12) +
            result.minTime.toFixed(4).padStart(12) +
            result.maxTime.toFixed(4).padStart(12) +
            throughput.padStart(15)
        );
    }
    console.log('='.repeat(90));
}

async function main() {
    console.log('Starting process system benchmarks...\n');
    console.log('This will take a few minutes...\n');

    const results: BenchmarkResult[] = [];

    // ========================================================================
    // Section 1: Process Spawn Overhead
    // ========================================================================
    console.log('Section 1: Process Spawn Overhead');
    console.log('-'.repeat(50));

    console.log('  Setting up interpreters with state...');
    await setupSmallStateInterpreter();
    await setupLargeStateInterpreter();

    console.log('  Measuring simple process spawn...');
    const spawnSimple = await benchmark('Spawn (simple code)', spawnSimpleProcess, 100);
    spawnSimple.throughput = 1000 / spawnSimple.avgTime;
    results.push(spawnSimple);

    console.log('  Measuring spawn with small state...');
    const spawnSmall = await benchmark('Spawn (with small state)', spawnWithSmallState, 100);
    spawnSmall.throughput = 1000 / spawnSmall.avgTime;
    results.push(spawnSmall);

    console.log('  Measuring spawn with large state (100 vars + 100 funcs)...');
    const spawnLarge = await benchmark('Spawn (with large state)', spawnWithLargeState, 50);
    spawnLarge.throughput = 1000 / spawnLarge.avgTime;
    results.push(spawnLarge);

    // ========================================================================
    // Section 2: Message Passing Performance
    // ========================================================================
    console.log('\nSection 2: Message Passing Performance');
    console.log('-'.repeat(50));

    console.log('  Measuring single message round-trip...');
    const msgSingle = await benchmark('Message passing (1 msg)', singleMessagePassing, 50);
    msgSingle.throughput = 1000 / msgSingle.avgTime;
    results.push(msgSingle);

    console.log('  Measuring 10 message round-trips...');
    const msgTen = await benchmark('Message passing (10 msgs)', () => multipleMessages(10), 50);
    msgTen.throughput = 10000 / msgTen.avgTime; // messages per second
    results.push(msgTen);

    console.log('  Measuring 100 message round-trips...');
    const msgHundred = await benchmark('Message passing (100 msgs)', () => multipleMessages(100), 20);
    msgHundred.throughput = 100000 / msgHundred.avgTime; // messages per second
    results.push(msgHundred);

    // ========================================================================
    // Section 3: Concurrent Process Scaling
    // ========================================================================
    console.log('\nSection 3: Concurrent Process Scaling');
    console.log('-'.repeat(50));

    console.log('  Spawning 10 processes...');
    const scaleTen = await benchmark('Spawn 10 processes', () => spawnManyProcesses(10), 20);
    scaleTen.throughput = 10000 / scaleTen.avgTime; // processes per second
    results.push(scaleTen);

    console.log('  Spawning 100 processes...');
    const scaleHundred = await benchmark('Spawn 100 processes', () => spawnManyProcesses(100), 10);
    scaleHundred.throughput = 100000 / scaleHundred.avgTime;
    results.push(scaleHundred);

    console.log('  Spawning 1000 processes (this may take a while)...');
    const scaleThousand = await benchmark('Spawn 1000 processes', () => spawnManyProcesses(1000), 3, 1);
    scaleThousand.throughput = 1000000 / scaleThousand.avgTime;
    results.push(scaleThousand);

    // ========================================================================
    // Section 4: Concurrent Computation
    // ========================================================================
    console.log('\nSection 4: Concurrent Computation (Fibonacci)');
    console.log('-'.repeat(50));

    console.log('  10 concurrent fibonacci(15) computations...');
    const comp10 = await benchmark('10 concurrent fib(15)', () => concurrentComputation(10), 10);
    results.push(comp10);

    console.log('  100 concurrent fibonacci(15) computations...');
    const comp100 = await benchmark('100 concurrent fib(15)', () => concurrentComputation(100), 3);
    results.push(comp100);

    // ========================================================================
    // Section 5: Memory Usage Analysis
    // ========================================================================
    console.log('\nSection 5: Memory Usage Analysis');
    console.log('-'.repeat(50));

    forceGC();
    const beforeMem = getMemoryUsage();
    console.log(`  Memory before: ${beforeMem.heapUsed} MB heap, ${beforeMem.rss} MB RSS`);

    console.log('  Spawning 1000 processes and measuring memory...');
    await spawnManyProcesses(1000);

    forceGC();
    const afterMem = getMemoryUsage();
    console.log(`  Memory after:  ${afterMem.heapUsed} MB heap, ${afterMem.rss} MB RSS`);
    const memDiff = (parseFloat(afterMem.heapUsed) - parseFloat(beforeMem.heapUsed)).toFixed(2);
    console.log(`  Memory diff:   ${memDiff} MB (${(parseFloat(memDiff) / 1000 * 1024).toFixed(2)} KB per process)`);

    // Print results
    printResults(results);

    // Analysis
    console.log('\n' + '='.repeat(90));
    console.log('ANALYSIS');
    console.log('='.repeat(90));

    const simpleSpawn = results.find(r => r.name.includes('simple code'));
    const smallState = results.find(r => r.name.includes('small state'));
    const largeState = results.find(r => r.name.includes('large state'));

    if (simpleSpawn && smallState && largeState) {
        console.log('\nState Cloning Overhead:');
        const smallOverhead = ((smallState.avgTime - simpleSpawn.avgTime) / simpleSpawn.avgTime * 100).toFixed(1);
        const largeOverhead = ((largeState.avgTime - simpleSpawn.avgTime) / simpleSpawn.avgTime * 100).toFixed(1);
        console.log(`  Small state (3 vars + 1 func): +${smallOverhead}% slower`);
        console.log(`  Large state (100 vars + 100 funcs): +${largeOverhead}% slower`);
        console.log(`  Per-item overhead: ~${((largeState.avgTime - simpleSpawn.avgTime) / 200).toFixed(4)} ms/item`);
    }

    const scaleRes10 = results.find(r => r.name === 'Spawn 10 processes');
    const scaleRes100 = results.find(r => r.name === 'Spawn 100 processes');
    const scaleRes1000 = results.find(r => r.name === 'Spawn 1000 processes');

    if (scaleRes10 && scaleRes100 && scaleRes1000) {
        console.log('\nScaling Analysis:');
        const avgPer10 = scaleRes10.avgTime / 10;
        const avgPer100 = scaleRes100.avgTime / 100;
        const avgPer1000 = scaleRes1000.avgTime / 1000;
        console.log(`  Average spawn time (10 procs):   ${avgPer10.toFixed(4)} ms/process`);
        console.log(`  Average spawn time (100 procs):  ${avgPer100.toFixed(4)} ms/process`);
        console.log(`  Average spawn time (1000 procs): ${avgPer1000.toFixed(4)} ms/process`);
        const scalingFactor = (avgPer1000 / avgPer10).toFixed(2);
        console.log(`  Scaling factor (1000 vs 10):     ${scalingFactor}x`);
        if (parseFloat(scalingFactor) < 1.5) {
            console.log('  ✓ Good scaling - sublinear overhead');
        } else if (parseFloat(scalingFactor) < 2.5) {
            console.log('  ⚠ Moderate scaling degradation');
        } else {
            console.log('  ✗ Poor scaling - superlinear overhead');
        }
    }

    const msgRes1 = results.find(r => r.name.includes('(1 msg)'));
    const msgRes100 = results.find(r => r.name.includes('(100 msgs)'));

    if (msgRes1 && msgRes100) {
        console.log('\nMessage Passing:');
        console.log(`  Single message latency: ${msgRes1.avgTime.toFixed(2)} ms`);
        console.log(`  Per-message cost (100 msgs): ${(msgRes100.avgTime / 100).toFixed(4)} ms`);
        console.log(`  Throughput: ${msgRes100.throughput?.toFixed(0)} messages/second`);
    }

    console.log('\nRecommendations:');
    if (largeState && simpleSpawn) {
        const overhead = largeState.avgTime - simpleSpawn.avgTime;
        if (overhead > 10) {
            console.log('  - Large state cloning is expensive. Consider passing only needed state.');
        } else {
            console.log('  - State cloning overhead is acceptable for most use cases.');
        }
    }
    console.log('  - Processes are lightweight enough for fine-grained concurrency.');
    console.log('  - Message passing is suitable for moderate-throughput communication.');
    console.log('  - Consider process pooling for very high spawn rates.');
    console.log('');
}

main().catch(console.error);
