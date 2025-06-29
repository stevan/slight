import { REPL, Tokenizer, Parser, Compiler, Interpreter, Output } from '../src/ML.js';

async function main() {
    const repl        = new REPL();
    const tokenizer   = new Tokenizer();
    const parser      = new Parser();
    const compiler    = new Compiler();
    const interpreter = new Interpreter();
    const output      = new Output();

    try {
        await output.run(
            interpreter.run(
                compiler.run(
                    parser.run(
                        tokenizer.run(
                            repl.run()
                        )
                    )
                )
            )
        );
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
