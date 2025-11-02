#!/usr/bin/env node

import { TracingInterpreter } from '../src/Slight/TracingInterpreter.js';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { isPipelineError } from '../src/Slight/Types.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

interface TraceOptions {
    enableConsole: boolean;
    captureResults: boolean;
    maxDepth: number;
    includeTimings: boolean;
    showSummary: boolean;
    exportJson: boolean;
}

async function evaluateCode(interpreter: TracingInterpreter, code: string): Promise<any> {
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

async function main() {
    const args = process.argv.slice(2);

    // Default options
    const traceOptions: TraceOptions = {
        enableConsole: true,
        captureResults: true,
        maxDepth: Infinity,
        includeTimings: true,
        showSummary: true,
        exportJson: false
    };

    let codeSource: string | null = null;
    let isFile = false;

    // Parse arguments
    let i = 0;
    while (i < args.length) {
        const arg = args[i];

        if (arg === '-e' || arg === '--eval') {
            if (i + 1 >= args.length) {
                console.error('Error: -e/--eval requires an expression');
                process.exit(1);
            }
            codeSource = args[i + 1];
            isFile = false;
            i += 2;
        } else if (arg === '--no-console' || arg === '--silent') {
            traceOptions.enableConsole = false;
            i++;
        } else if (arg === '--no-timings') {
            traceOptions.includeTimings = false;
            i++;
        } else if (arg === '--no-summary') {
            traceOptions.showSummary = false;
            i++;
        } else if (arg === '--export-json') {
            traceOptions.exportJson = true;
            i++;
        } else if (arg === '--max-depth') {
            if (i + 1 >= args.length) {
                console.error('Error: --max-depth requires a number');
                process.exit(1);
            }
            traceOptions.maxDepth = parseInt(args[i + 1], 10);
            if (isNaN(traceOptions.maxDepth) || traceOptions.maxDepth < 1) {
                console.error('Error: --max-depth must be a positive integer');
                process.exit(1);
            }
            i += 2;
        } else if (arg === '-h' || arg === '--help') {
            showHelp();
            process.exit(0);
        } else if (arg.startsWith('-')) {
            console.error(`Error: Unknown option: ${arg}`);
            showHelp();
            process.exit(1);
        } else {
            // Assume it's a file path
            codeSource = arg;
            isFile = true;
            i++;
        }
    }

    // Validate we have code to execute
    if (!codeSource) {
        console.error('Error: No code to execute. Use -e <expr> or provide a file path.');
        showHelp();
        process.exit(1);
    }

    // Read file if necessary
    let code: string;
    if (isFile) {
        try {
            const filepath = resolve(codeSource);
            code = readFileSync(filepath, 'utf8');
        } catch (error) {
            console.error(`Error reading file ${codeSource}:`, (error as Error).message);
            process.exit(1);
        }
    } else {
        code = codeSource;
    }

    // Create tracing interpreter
    const interpreter = new TracingInterpreter(undefined, {
        enableConsole: traceOptions.enableConsole,
        captureResults: traceOptions.captureResults,
        maxDepth: traceOptions.maxDepth,
        includeTimings: traceOptions.includeTimings
    });

    // Execute code
    try {
        const result = await evaluateCode(interpreter, code);

        // Show result if console output is disabled
        if (!traceOptions.enableConsole) {
            console.log('\n=== Result ===');
            console.log(result);
        }

        // Show summary
        if (traceOptions.showSummary) {
            interpreter.printTraceSummary();
        }

        // Export JSON if requested
        if (traceOptions.exportJson) {
            console.log('\n=== Trace JSON ===');
            console.log(interpreter.exportTraceAsJSON());
        }
    } catch (error) {
        console.error('\n=== Error ===');
        console.error((error as Error).message);

        // Still show summary if there were any traces before the error
        if (traceOptions.showSummary && interpreter.getTraceLog().length > 0) {
            interpreter.printTraceSummary();
        }

        process.exit(1);
    }
}

function showHelp() {
    console.log(`slight-trace - Debugging tool with execution tracing

Usage:
  slight-trace [options] <file>           Trace execution of a Slight source file
  slight-trace [options] -e <expr>        Trace evaluation of an expression

Options:
  -e, --eval <expr>                       Evaluate an expression
  --no-console, --silent                  Don't print traces in real-time
  --no-timings                            Don't include timing information
  --no-summary                            Don't print trace summary at end
  --max-depth <n>                         Limit trace depth (default: unlimited)
  --export-json                           Export trace log as JSON
  -h, --help                              Show this help message

Examples:
  # Trace a simple expression
  slight-trace -e "(+ 1 2)"

  # Trace a recursive function with summary
  slight-trace -e "(def fib (fun (n) (cond ((< n 2) n) (else (+ (fib (- n 1)) (fib (- n 2))))))) (fib 5)"

  # Trace a file
  slight-trace program.sl

  # Silent mode with summary only
  slight-trace --silent program.sl

  # Limit trace depth to avoid spam
  slight-trace --max-depth 3 recursive-program.sl

  # Export trace as JSON for analysis
  slight-trace --export-json program.sl > trace.json

  # No console, just summary and result
  slight-trace --no-console --no-timings -e "(list/map (fun (x) (* x 2)) (list 1 2 3))"

The tracer shows:
  → Entry into builtin function call
  ← Exit from builtin function call
  Indentation shows call depth
  [Nms] shows execution time (if --include-timings)

Trace Summary includes:
  - Total builtin calls
  - Total execution time
  - Number of errors
  - Maximum call depth
  - Most frequently called builtins`);
}

// Run the CLI
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
