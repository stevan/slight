#!/usr/bin/env node

import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { StandardOutput, StandardError } from '../src/Slight/Outputs.js';

async function* stringSource(code: string) {
    yield code;
}

async function main() {
    console.log('=== Slight I/O Demo ===\n');

    const code = `(begin
        (say "This is from say - goes to stdout")
        (print "This is from print ")
        (print "without newlines ")
        (say "then this completes the line")
        (warn "This is a warning - goes to stderr")
        (say "The answer is:" (* 6 7))
    )`;

    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(stringSource(code));
    const ast = parser.run(tokens);
    const expanded = macroExpander.run(ast);
    const output = interpreter.run(expanded);

    // Use StandardOutput for stdout and StandardError for stderr
    const stdout = new StandardOutput();
    const stderr = new StandardError();

    // Collect tokens and route them
    const allTokens: any[] = [];
    for await (const token of output) {
        allTokens.push(token);
    }

    // Replay through both output handlers
    async function* replayStdout() {
        for (const token of allTokens) {
            yield token;
        }
    }

    async function* replayStderr() {
        for (const token of allTokens) {
            yield token;
        }
    }

    await Promise.all([
        stdout.run(replayStdout()),
        stderr.run(replayStderr())
    ]);

    console.log('\n=== Demo Complete ===');
    console.log('Note: Warnings appear on stderr. Run with "2>/dev/null" to hide stderr,');
    console.log('or ">/dev/null" to hide stdout and see only stderr.');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
