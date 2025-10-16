import { Tokenizer } from './Slight/Tokenizer.js';
import { Parser } from './Slight/Parser.js';
import { MacroExpander } from './Slight/MacroExpander.js';
import { BrowserInterpreter } from './Slight/BrowserInterpreter.js';
import {
    InputSource,
    OutputSink,
    SourceStream,
    OutputStream,
    OutputHandle,
    OutputToken
} from './Slight/Types.js';

// Simple string input source for browser
export class StringSource implements InputSource {
    private code: string;

    constructor(code: string) {
        this.code = code;
    }

    async *run(): SourceStream {
        yield this.code;
    }
}

// Simple array output sink for browser
export class ArrayOutput implements OutputSink {
    public results: any[] = [];
    public errors: any[] = [];

    async run(stream: OutputStream): Promise<void> {
        for await (const output of stream) {
            if (output.type === OutputHandle.ERROR) {
                this.errors.push(output.value);
            } else {
                this.results.push(output.value);
            }
        }
    }
}

// Browser version of Slight
export class BrowserSlight {
    public input: InputSource;
    public tokenizer: Tokenizer;
    public parser: Parser;
    public macroExpander: MacroExpander;
    public interpreter: BrowserInterpreter;
    public output: OutputSink;

    constructor(input: InputSource, output: OutputSink) {
        this.input = input;
        this.tokenizer = new Tokenizer();
        this.parser = new Parser();
        // Pass BrowserInterpreter factory to MacroExpander
        this.macroExpander = new MacroExpander(() => new BrowserInterpreter());
        this.interpreter = new BrowserInterpreter();
        this.output = output;
    }

    getInterpreter(): BrowserInterpreter {
        return this.interpreter;
    }

    run(): Promise<void> {
        return this.output.run(
            this.interpreter.run(
                this.macroExpander.run(
                    this.parser.run(
                        this.tokenizer.run(
                            this.input.run()
                        )
                    )
                )
            )
        );
    }
}

// Convenience function to evaluate code and return results
export async function evaluate(code: string): Promise<{ results: any[], errors: any[] }> {
    const input = new StringSource(code);
    const output = new ArrayOutput();
    const slight = new BrowserSlight(input, output);

    await slight.run();

    return {
        results: output.results,
        errors: output.errors
    };
}

// Export core components for advanced usage
export { Tokenizer } from './Slight/Tokenizer.js';
export { Parser } from './Slight/Parser.js';
export { MacroExpander } from './Slight/MacroExpander.js';
export { BrowserInterpreter } from './Slight/BrowserInterpreter.js';
export * from './Slight/AST.js';
export * from './Slight/Types.js';