import { Console } from 'console';

import { Tokenizer }               from './Slight/Tokenizer.js';
import { Parser }                  from './Slight/Parser.js';
import { Interpreter }             from './Slight/Interpreter.js';
import {
    InputSource,
    OutputSink,
    SourceStream,
    TokenStream,
    ASTStream,
    OutputStream
} from './Slight/Types.js';

export class Slight {
    public input       : InputSource;
    public tokenizer   : Tokenizer;
    public parser      : Parser;
    public interpreter : Interpreter;
    public output      : OutputSink;

    private logger : Console  = new Console({
        stdout           : process.stdout,
        stderr           : process.stderr,
        inspectOptions   : {
            compact      : true,
            breakLength  : Infinity,
            depth        : 2,
        },
        groupIndentation : 4,
    });

    constructor (input : InputSource, output : OutputSink) {
        this.input       = input;
        this.tokenizer   = new Tokenizer();
        this.parser      = new Parser();
        this.interpreter = new Interpreter();
        this.output      = output;
    }

    run () : Promise<void> {
        return this.output.run(
            this.interpreter.run(
                this.parser.run(
                    this.tokenizer.run(
                        this.input.run()
                    )
                )
            )
        );
    }

    monitor () : Promise<void> {
        return this.output.run(
            this.monitorOutputStream(this.interpreter.run(
                this.monitorASTStream(this.parser.run(
                    this.monitorTokenStream(this.tokenizer.run(
                        this.monitorSourceStream(this.input.run())
                    ))
                ))
            ))
        );
    }

    async *monitorOutputStream (source: OutputStream) : OutputStream {
        let label = '*OUTPUT*';
        for await (const src of source) {
            this.logger.group(`<${label}> ╰───╮`);
            this.logger.log(`  ${label} : ${JSON.stringify(src)}`);
            yield src;
            this.logger.groupEnd();
            this.logger.log(  `<${label}> ╭───╯`);
        }
    }

    async *monitorASTStream (source: ASTStream) : ASTStream {
        let label = 'AST_NODE';
        for await (const src of source) {
            this.logger.group(`<${label}> ╰───╮`);
            this.logger.log(`  ${label} ${JSON.stringify([src], null, 4).replace(/\n/g, "\n           ")}`);
            yield src;
            this.logger.groupEnd();
            this.logger.log(  `<${label}> ╭───╯`);
        }
    }

    async *monitorTokenStream (source: TokenStream) : TokenStream {
        let label = 'TOKENIZE';
        for await (const src of source) {
            this.logger.group(`<${label}> ╰───╮`);
            this.logger.log(`  ${label} : ${JSON.stringify(src)}`);
            yield src;
            this.logger.groupEnd();
            this.logger.log(  `<${label}> ╭───╯`);
        }
    }

    async *monitorSourceStream (source: SourceStream) : SourceStream {
        let label = '*SOURCE*';
        for await (const src of source) {
            this.logger.group(`<${label}> ▶───╮`);
            this.logger.log(`  ${label} : ${JSON.stringify(src)}`);
            yield src;
            this.logger.groupEnd();
            this.logger.log(  `<${label}> ◀───╯`);
        }
    }
}



