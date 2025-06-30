
import { REPL, REPLOutput } from '../src/REPL.js';
import { Tokenizer }        from '../src/Tokenizer.js';
import { Parser }           from '../src/Parser.js';
import { Compiler }         from '../src/Compiler.js';
import { Interpreter }      from '../src/Interpreter.js';
import {
    MonitorOutputStream,
    MonitorCompiledStream,
    MonitorASTStream,
    MonitorTokenStream,
    MonitorSourceStream,
} from '../src/Monitors.js'

async function main() {
    const repl        = new REPL();
    const tokenizer   = new Tokenizer();
    const parser      = new Parser();
    const compiler    = new Compiler();
    const interpreter = new Interpreter();
    const output      = new REPLOutput();

    try {
        await output.run(
            MonitorOutputStream(interpreter.run(
                MonitorCompiledStream(compiler.run(
                    MonitorASTStream(parser.run(
                        MonitorTokenStream(tokenizer.run(
                            MonitorSourceStream(repl.run())
                        ))
                    ))
                ))
            ))
        );
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
