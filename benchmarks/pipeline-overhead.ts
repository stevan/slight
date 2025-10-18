/**
 * Benchmark script to measure async generator pipeline overhead
 *
 * This script compares:
 * 1. Full pipeline execution (Tokenizer → Parser → MacroExpander → Interpreter)
 * 2. Direct AST evaluation (bypassing pipeline stages)
 * 3. Individual stage performance
 *
 * Run with: tsc && node js/benchmarks/pipeline-overhead.js
 */

import { performance } from 'node:perf_hooks';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { NumberNode, CallNode, SymbolNode } from '../src/Slight/AST.js';

async function* stringSource(code: string) {
    yield code;
}

// Benchmark configuration
const ITERATIONS = 1000;
const WARMUP = 100;

interface BenchmarkResult {
    name: string;
    avgTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
}

async function benchmark(name: string, fn: () => Promise<void>, iterations: number = ITERATIONS): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < WARMUP; i++) {
        await fn();
    }

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

// Test programs
const SIMPLE_EXPR = '(+ 1 2)';
const COMPLEX_EXPR = '(+ (* 2 3) (- 10 5) (/ 20 4))';
const FUNCTION_DEF = '(def factorial (n) (cond ((< n 2) 1) (true (* n (factorial (- n 1))))))';
const RECURSIVE_CALL = '(factorial 10)';

async function fullPipeline(code: string): Promise<void> {
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

async function directEvaluation(ast: any, interpreter: Interpreter): Promise<any> {
    return await ast.evaluate(interpreter, new Map());
}

async function tokenizerOnly(code: string): Promise<void> {
    const tokenizer = new Tokenizer();
    const tokens = tokenizer.run(stringSource(code));
    for await (const token of tokens) {
        // Consume tokens
    }
}

async function parserOnly(code: string): Promise<void> {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const tokens = tokenizer.run(stringSource(code));
    const asts = parser.run(tokens);
    for await (const ast of asts) {
        // Consume ASTs
    }
}

async function macroExpanderOnly(code: string): Promise<void> {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();

    const tokens = tokenizer.run(stringSource(code));
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);

    for await (const ast of expanded) {
        // Consume expanded ASTs
    }
}

async function interpreterOnly(code: string): Promise<void> {
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

function printResults(results: BenchmarkResult[]) {
    console.log('\n' + '='.repeat(80));
    console.log('BENCHMARK RESULTS');
    console.log('='.repeat(80));
    console.log(`Iterations: ${ITERATIONS} (after ${WARMUP} warmup iterations)\n`);

    const maxNameLength = Math.max(...results.map(r => r.name.length));

    console.log('Benchmark'.padEnd(maxNameLength + 2) +
                'Avg (ms)'.padStart(12) +
                'Min (ms)'.padStart(12) +
                'Max (ms)'.padStart(12) +
                'Total (ms)'.padStart(12));
    console.log('-'.repeat(80));

    for (const result of results) {
        console.log(
            result.name.padEnd(maxNameLength + 2) +
            result.avgTime.toFixed(4).padStart(12) +
            result.minTime.toFixed(4).padStart(12) +
            result.maxTime.toFixed(4).padStart(12) +
            result.totalTime.toFixed(2).padStart(12)
        );
    }

    console.log('\n' + '='.repeat(80));
    console.log('OVERHEAD ANALYSIS');
    console.log('='.repeat(80));

    // Calculate overhead percentages
    const fullPipelineResult = results.find(r => r.name.includes('Full Pipeline'));
    const tokenizerResult = results.find(r => r.name.includes('Tokenizer'));
    const parserResult = results.find(r => r.name.includes('Parser'));
    const macroResult = results.find(r => r.name.includes('Macro'));

    if (fullPipelineResult && tokenizerResult && parserResult && macroResult) {
        const tokenizerPct = (tokenizerResult.avgTime / fullPipelineResult.avgTime) * 100;
        const parserPct = (parserResult.avgTime / fullPipelineResult.avgTime) * 100;
        const macroPct = (macroResult.avgTime / fullPipelineResult.avgTime) * 100;
        const interpreterPct = 100 - tokenizerPct - parserPct - macroPct;

        console.log(`\nPipeline stage breakdown (${fullPipelineResult.name}):`);
        console.log(`  Tokenizer:     ${tokenizerPct.toFixed(2)}%`);
        console.log(`  Parser:        ${parserPct.toFixed(2)}%`);
        console.log(`  MacroExpander: ${macroPct.toFixed(2)}%`);
        console.log(`  Interpreter:   ${interpreterPct.toFixed(2)}%`);
    }

    console.log('\n');
}

async function main() {
    console.log('Starting pipeline overhead benchmarks...\n');

    const results: BenchmarkResult[] = [];

    // Benchmark 1: Simple expression
    console.log('Benchmarking simple expression: ' + SIMPLE_EXPR);
    results.push(await benchmark('Full Pipeline (simple)', () => fullPipeline(SIMPLE_EXPR)));
    results.push(await benchmark('Tokenizer only (simple)', () => tokenizerOnly(SIMPLE_EXPR)));
    results.push(await benchmark('Parser only (simple)', () => parserOnly(SIMPLE_EXPR)));
    results.push(await benchmark('Macro expander only (simple)', () => macroExpanderOnly(SIMPLE_EXPR)));

    // Benchmark 2: Complex expression
    console.log('Benchmarking complex expression: ' + COMPLEX_EXPR);
    results.push(await benchmark('Full Pipeline (complex)', () => fullPipeline(COMPLEX_EXPR)));
    results.push(await benchmark('Tokenizer only (complex)', () => tokenizerOnly(COMPLEX_EXPR)));
    results.push(await benchmark('Parser only (complex)', () => parserOnly(COMPLEX_EXPR)));

    // Benchmark 3: Function definition + call
    console.log('Benchmarking function definition and recursive call');
    const setupCode = async () => {
        await fullPipeline(FUNCTION_DEF);
        await fullPipeline(RECURSIVE_CALL);
    };
    results.push(await benchmark('Function def + recursive call', setupCode));

    // Benchmark 4: Direct AST evaluation (no pipeline)
    console.log('Benchmarking direct AST evaluation (bypassing pipeline)');
    const interpreter = new Interpreter();
    const simpleAST = new CallNode([
        new SymbolNode('+'),
        new NumberNode(1),
        new NumberNode(2)
    ]);
    results.push(await benchmark('Direct AST eval (simple)', () => directEvaluation(simpleAST, interpreter)));

    printResults(results);

    console.log('Profiling Tips:');
    console.log('  1. Use Node.js CPU profiler: node --cpu-prof js/benchmarks/pipeline-overhead.js');
    console.log('  2. Use Chrome DevTools: node --inspect-brk js/benchmarks/pipeline-overhead.js');
    console.log('  3. Install clinic.js: npm i -g clinic && clinic doctor -- node js/benchmarks/pipeline-overhead.js');
    console.log('  4. Use performance.mark() and performance.measure() for fine-grained profiling');
    console.log('  5. Set NODE_ENV=production to disable debug overhead\n');
}

main().catch(console.error);
