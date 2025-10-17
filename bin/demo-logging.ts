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
    console.log('=== Slight Logging Demo ===\n');

    const code = `(begin
        (log/info "Server started on port 8080")
        (log/debug "Config loaded:" (list "env" "production"))
        (log/warn "Using deprecated API version 1.0")
        (say "Processing request...")
        (log/error "Failed to connect to database")
        (say "")
        (say "Disabling logging...")
        (log/disable)
        (log/info "This message will not appear")
        (log/debug "Neither will this")
        (say "Re-enabling logging...")
        (log/enable)
        (log/info "Logging is back on")
        (warn "This is a warning via warn()")
        (say "")
        (say "Demo complete!"))`;

    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(stringSource(code));
    const ast = parser.run(tokens);
    const expanded = macroExpander.run(ast);
    const output = interpreter.run(expanded);

    // Collect all tokens
    const allTokens: any[] = [];
    for await (const token of output) {
        allTokens.push(token);
    }

    // Route through StandardOutput and StandardError
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

    const stdout = new StandardOutput();
    const stderr = new StandardError();

    await Promise.all([
        stdout.run(replayStdout()),
        stderr.run(replayStderr())
    ]);

    console.log('\n=== End Demo ===');
    console.log('\nNote: Log messages appear on stderr with emoji prefixes:');
    console.log('  🌈 INFO    - Informational messages');
    console.log('  💩 DEBUG   - Debug/diagnostic messages');
    console.log('  ⚡️ WARN    - Warnings');
    console.log('  💔 ERROR   - Error messages (logged, not thrown)');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
