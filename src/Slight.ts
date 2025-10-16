import { Tokenizer }               from './Slight/Tokenizer.js';
import { Parser }                  from './Slight/Parser.js';
import { MacroExpander }           from './Slight/MacroExpander.js';
import { Interpreter }             from './Slight/Interpreter.js';
import { ProcessRuntime }          from './Slight/ProcessRuntime.js';
import {
    InputSource,
    OutputSink
} from './Slight/Types.js';

export class Slight {
    public input       : InputSource;
    public tokenizer   : Tokenizer;
    public parser      : Parser;
    public macroExpander : MacroExpander;
    public interpreter : Interpreter;
    public output      : OutputSink;

    constructor (input : InputSource, output : OutputSink) {
        this.input       = input;
        this.tokenizer   = new Tokenizer();
        this.parser      = new Parser();
        this.macroExpander = new MacroExpander();
        this.interpreter = new Interpreter();
        this.output      = output;

        // Set up ProcessRuntime to use Slight for spawning
        const runtime = ProcessRuntime.getInstance();
        runtime.setSlightFactory((input, output) => new Slight(input, output));
    }

    getInterpreter() : Interpreter {
        return this.interpreter;
    }

    run () : Promise<void> {
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



