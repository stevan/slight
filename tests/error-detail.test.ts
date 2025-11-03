import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { isPipelineError } from '../src/Slight/Types.js';

async function* stringSource(code: string) {
    yield code;
}

async function test() {
    const code = `(defvar x 10)
(say x)
(say y)`;

    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(stringSource(code));
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);

    if (process.env['DEBUG']) {
        console.log('Running interpreter...\n');
    }
    for await (const result of interpreter.run(expanded)) {
        if (process.env['DEBUG']) {
            if (isPipelineError(result.value)) {
                console.log('ERROR DETECTED:');
                console.log('  Type:', result.type);
                console.log('  Value:', result.value);
                console.log('  Details:', (result.value as any).details);
            } else {
                console.log('Result:', result.value);
            }
        }
    }
}

test().catch(console.error);