#!/usr/bin/env node

import { Slight } from '../src/Slight.js';
import { ConsoleOutput } from '../src/Slight/Outputs.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Simple string source for one-shot evaluation
class StringSource {
    private sent = false;

    constructor(private content: string) {}

    async *run() {
        if (!this.sent) {
            this.sent = true;
            yield this.content;
        }
    }
}

// File source for reading from a file
class FileSource {
    constructor(private filepath: string) {}

    async *run() {
        try {
            const content = readFileSync(this.filepath, 'utf8');
            yield content;
        } catch (error) {
            console.error(`Error reading file ${this.filepath}:`, (error as Error).message);
            process.exit(1);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);

    // Parse include paths and remaining arguments
    const includePaths: string[] = [];
    let remainingArgs: string[] = [];
    let debugMode = false;

    let i = 0;
    while (i < args.length) {
        if (args[i] === '-i' || args[i] === '--include-path') {
            if (i + 1 >= args.length) {
                console.error('Error: -i/--include-path requires a path argument');
                process.exit(1);
            }
            includePaths.push(resolve(args[i + 1]));
            i += 2;
        } else if (args[i] === '--debug') {
            debugMode = true;
            i++;
        } else {
            remainingArgs.push(args[i]);
            i++;
        }
    }

    // Parse command line arguments
    if (remainingArgs.length === 0) {
        // No arguments - start REPL
        let slight;

        if (debugMode) {
            // Use EnhancedREPL with debugging features
            const { EnhancedREPL, EnhancedREPLOutput } = await import('../src/Slight/EnhancedREPL.js');
            slight = new Slight(
                new EnhancedREPL(),
                new EnhancedREPLOutput()
            );
        } else {
            // Use standard REPL
            const { REPL, REPLOutput } = await import('../src/Slight/REPL.js');
            slight = new Slight(
                new REPL(),
                new REPLOutput()
            );
        }

        // Set include paths if any
        if (includePaths.length > 0) {
            slight.getInterpreter().setIncludePaths(includePaths);
        }
        await slight.run();
    } else if (remainingArgs[0] === '-e' || remainingArgs[0] === '--eval') {
        // Evaluate expression
        if (remainingArgs.length < 2) {
            console.error('Error: -e/--eval requires an expression');
            process.exit(1);
        }
        const expression = remainingArgs[1];
        const slight = new Slight(
            new StringSource(expression),
            new ConsoleOutput('')
        );
        // Set include paths if any
        if (includePaths.length > 0) {
            slight.getInterpreter().setIncludePaths(includePaths);
        }
        await slight.run();
    } else if (remainingArgs[0] === '-h' || remainingArgs[0] === '--help') {
        // Show help
        console.log(`Slight - A mini-LISP interpreter

Usage:
  slight                                    Start interactive REPL
  slight [options] <file>                  Execute a Slight source file
  slight [options] -e <expr>               Evaluate an expression
  slight [options] --eval <expr>           Evaluate an expression
  slight -h, --help                        Show this help message

Options:
  -i, --include-path <path>                Add directory to include search path
                                            (can be used multiple times)
  --debug                                   Enable debug mode with enhanced REPL
                                            (adds :ast, :tokens, :expand commands)

Examples:
  slight                                   # Start REPL
  slight --debug                            # Start REPL with debugging features
  slight program.sl                        # Run program.sl
  slight -e "(+ 1 2)"                      # Evaluate expression, prints 3
  slight -i lib/ program.sl                # Run with lib/ in include path
  slight -i lib/ -i vendor/ program.sl     # Multiple include paths`);
        process.exit(0);
    } else {
        // Execute file
        const filepath = resolve(remainingArgs[0]);
        const slight = new Slight(
            new FileSource(filepath),
            new ConsoleOutput('')
        );
        // Set include paths if any
        if (includePaths.length > 0) {
            slight.getInterpreter().setIncludePaths(includePaths);
        }
        // Also set the current file directory for the interpreter
        slight.getInterpreter().setCurrentFile(filepath);
        await slight.run();
    }
}

// Run the CLI
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});