import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { isPipelineError } from '../src/Slight/Types.js';

async function* stringSource(code: string) {
    yield code;
}

async function test() {
    const code = `(def x 10)
(say x)
(say y)`;

    const tokenizer = new Tokenizer();
    const parser = new Parser();

    // Check tokens
    if (process.env['DEBUG']) {
        console.log('=== TOKENS ===');
    }
    const tokens = tokenizer.run(stringSource(code));
    for await (const token of tokens) {
        if (!isPipelineError(token) && process.env['DEBUG']) {
            console.log(`${token.type} "${token.source}" at line ${token.line}, col ${token.column}`);
        }
    }

    // Check AST
    if (process.env['DEBUG']) {
        console.log('\n=== AST ===');
    }
    const asts = parser.run(tokenizer.run(stringSource(code)));
    for await (const ast of asts) {
        if (!isPipelineError(ast) && process.env['DEBUG']) {
            console.log(`${ast.type} at`, ast.location);
        }
    }
}

test().catch(console.error);