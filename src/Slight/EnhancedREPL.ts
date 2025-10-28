import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { InputSource, OutputSink, OutputToken, isPipelineError, OutputStream } from './Types.js';
import { DebugTools } from './DebugTools.js';
import { Interpreter } from './Interpreter.js';
import { MacroExpander } from './MacroExpander.js';

/**
 * Enhanced REPL with debugging commands
 */
export class EnhancedREPL implements InputSource {
    private $readline: readline.Interface;
    private debugTools = new DebugTools();
    private interpreter?: Interpreter;
    private macroExpander?: MacroExpander;
    private debugMode = false;
    private history: string[] = [];
    private bindings = new Map<string, any>();
    private functions = new Map<string, any>();
    private macros = new Map<string, any>();

    constructor() {
        this.$readline = readline.createInterface({ input, output });
        this.printBanner();
        this.printHelp();
    }

    private printBanner() {
        console.log(`
   _____ ___       __    __   (Enhanced)
  / ___// (_)___ _/ /_  / /_
  \\__ \\/ / / __ \`/ __ \\/ __/
 ___/ / / / /_/ / / / / /_
/____/_/_/\\__, /_/ /_/\\__/
         /____/ v0.0.1

Type :help for debug commands, :q to quit
        `);
    }

    private printHelp() {
        console.log(`
Debug Commands:
  :help              Show this help
  :q, :quit          Exit REPL
  :debug on/off      Toggle debug mode
  :ast <expr>        Show AST for expression
  :tokens <expr>     Show tokens for expression
  :expand <expr>     Show macro expansion
  :env               Show current environment
  :bindings          List all variables
  :functions         List all functions
  :macros            List all macros
  :history           Show command history
  :clear             Clear screen
        `);
    }

    async *run(): AsyncGenerator<string, void, void> {
        let buffer = '';
        let parenCount = 0;
        let prompt = '? ';

        while (true) {
            const line = await this.$readline.question(prompt);

            // Exit commands
            if (line === ':q' || line === ':quit' || line === 'exit' || line === 'quit') {
                break;
            }

            // Handle special commands
            if (line.startsWith(':')) {
                await this.handleCommand(line);
                continue;
            }

            // Track history
            if (line.trim()) {
                this.history.push(line);
            }

            // Handle parentheses for multi-line input
            buffer += line + '\n';
            for (const char of line) {
                if (char === '(') parenCount++;
                if (char === ')') parenCount--;
            }

            prompt = parenCount > 0 ? '... ' : '? ';
            if (parenCount === 0 && buffer.trim() !== '') {
                if (this.debugMode) {
                    console.log('DEBUG: Input buffer:', buffer.trim());
                }
                yield buffer;
                buffer = '';
            }
        }
        this.$readline.close();
    }

    private async handleCommand(command: string) {
        const [cmd, ...args] = command.split(' ');
        const expr = args.join(' ');

        try {
            switch (cmd) {
                case ':help':
                    this.printHelp();
                    break;

                case ':debug':
                    if (args[0] === 'on') {
                        this.debugMode = true;
                        console.log('Debug mode ON');
                    } else if (args[0] === 'off') {
                        this.debugMode = false;
                        console.log('Debug mode OFF');
                    } else {
                        console.log('Debug mode is', this.debugMode ? 'ON' : 'OFF');
                    }
                    break;

                case ':ast':
                    if (expr) {
                        console.log(await this.debugTools.showAST(expr));
                    } else {
                        console.log('Usage: :ast <expression>');
                    }
                    break;

                case ':tokens':
                    if (expr) {
                        console.log(await this.debugTools.showTokens(expr));
                    } else {
                        console.log('Usage: :tokens <expression>');
                    }
                    break;

                case ':expand':
                    if (expr && this.macroExpander) {
                        console.log(await this.debugTools.showMacroExpansion(expr));
                    } else if (!this.macroExpander) {
                        console.log('Macro expander not initialized');
                    } else {
                        console.log('Usage: :expand <expression>');
                    }
                    break;

                case ':env':
                    console.log('=== ENVIRONMENT ===');
                    console.log(`Bindings: ${this.bindings.size}`);
                    console.log(`Functions: ${this.functions.size}`);
                    console.log(`Macros: ${this.macros.size}`);
                    if (this.interpreter) {
                        console.log(`Builtins: ${this.interpreter.builtins.size}`);
                    }
                    break;

                case ':bindings':
                    console.log('=== BINDINGS ===');
                    if (this.bindings.size === 0) {
                        console.log('(none)');
                    } else {
                        for (const [name, value] of this.bindings) {
                            console.log(`  ${name} = ${this.formatValue(value)}`);
                        }
                    }
                    break;

                case ':functions':
                    console.log('=== FUNCTIONS ===');
                    if (this.functions.size === 0) {
                        console.log('(none)');
                    } else {
                        for (const [name, func] of this.functions) {
                            const params = func.params || [];
                            console.log(`  ${name}(${params.join(', ')})`);
                        }
                    }
                    break;

                case ':macros':
                    console.log('=== MACROS ===');
                    if (this.macros.size === 0) {
                        console.log('(none)');
                    } else {
                        for (const [name, macro] of this.macros) {
                            const params = macro.params || [];
                            console.log(`  ${name}(${params.join(', ')})`);
                        }
                    }
                    break;

                case ':history':
                    console.log('=== HISTORY ===');
                    this.history.forEach((cmd, i) => {
                        console.log(`  ${i + 1}: ${cmd}`);
                    });
                    break;

                case ':clear':
                    console.clear();
                    this.printBanner();
                    break;

                default:
                    console.log(`Unknown command: ${cmd}. Type :help for available commands.`);
            }
        } catch (error) {
            console.error(`Error executing command: ${error}`);
        }
    }

    private formatValue(value: any): string {
        if (value === null || value === undefined) {
            return '()';
        }
        if (typeof value === 'string') {
            return `"${value}"`;
        }
        if (Array.isArray(value)) {
            return `(${value.map(v => this.formatValue(v)).join(' ')})`;
        }
        if (typeof value === 'object') {
            return '<object>';
        }
        return String(value);
    }

    setInterpreter(interpreter: Interpreter) {
        this.interpreter = interpreter;
        // Hook into interpreter to track definitions
        this.bindings = interpreter.bindings;
        this.functions = interpreter.functions;
        this.macros = interpreter.macros;
    }

    setMacroExpander(expander: MacroExpander) {
        this.macroExpander = expander;
    }
}

/**
 * Enhanced output with debug information
 */
export class EnhancedREPLOutput implements OutputSink {
    private debugMode = false;

    setDebugMode(enabled: boolean) {
        this.debugMode = enabled;
    }

    async run(source: OutputStream): Promise<void> {
        for await (const result of source) {
            if (this.debugMode) {
                console.log('DEBUG: Output token:', result.type);
            }
            console.log(result.type, this.prettyPrint(result));
        }
    }

    private prettyPrint(token: OutputToken | any): string {
        const value = token?.value !== undefined ? token.value : token;

        if (isPipelineError(value)) {
            // Enhanced error formatting
            let error = `[${value.stage} Error] ${value.message}`;
            if (value.details?.line && value.details?.column) {
                error = `\nError at line ${value.details.line}, column ${value.details.column}:\n  ${error}`;
            }
            return error;
        }

        if (value === null || value === undefined) {
            return '()';
        }
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (typeof value === 'number') {
            return value.toString();
        }
        if (typeof value === 'string') {
            let output = value;
            if (value.endsWith("\n")) {
                output = value.split("\n")[0];
            }
            return `"${output}"`;
        }
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return '()';
            }
            return `(${value.map(v => this.prettyPrint(v)).join(' ')})`;
        }
        return value.toString();
    }
}
