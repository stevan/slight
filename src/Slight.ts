
import { Tokenizer }               from './Slight/Tokenizer.js';
import { Parser }                  from './Slight/Parser.js';
import { Compiler }                from './Slight/Compiler.js';
import { Interpreter }             from './Slight/Interpreter.js';
import { InputSource, OutputSink } from './Slight/Types.js';
import {
    MonitorOutputStream,
    MonitorCompiledStream,
    MonitorASTStream,
    MonitorTokenStream,
    MonitorSourceStream,
} from './Slight/Monitors.js'

export class Slight {
    public input       : InputSource;
    public tokenizer   : Tokenizer;
    public parser      : Parser;
    public compiler    : Compiler;
    public interpreter : Interpreter;
    public output      : OutputSink;

    constructor (input : InputSource, output : OutputSink) {
        this.input       = input;
        this.tokenizer   = new Tokenizer();
        this.parser      = new Parser();
        this.compiler    = new Compiler();
        this.interpreter = new Interpreter();
        this.output      = output;
    }

    run () : Promise<void> {
        return this.output.run(
            this.interpreter.run(
                this.compiler.run(
                    this.parser.run(
                        this.tokenizer.run(
                            this.input.run()
                        )
                    )
                )
            )
        );
    }

    monitor () : Promise<void> {
        return this.output.run(
            MonitorOutputStream(this.interpreter.run(
                MonitorCompiledStream(this.compiler.run(
                    MonitorASTStream(this.parser.run(
                        MonitorTokenStream(this.tokenizer.run(
                            MonitorSourceStream(this.input.run())
                        ))
                    ))
                ))
            ))
        );
    }

}


