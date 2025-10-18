import { UndefinedSymbolError } from '../src/Slight/SlightError.js';
import { SymbolNode } from '../src/Slight/AST.js';

// Create a symbol node with location
const node = new SymbolNode('foo');
node.location = { line: 5, column: 10 };

// Create an error
const error = new UndefinedSymbolError('foo', node);

// Get pipeline error
const pipelineError = error.toPipelineError();

if (process.env['DEBUG']) {
    console.log('Pipeline Error:', JSON.stringify(pipelineError, null, 2));
    console.log('\nFormatted output:');
    console.log(error.format());
}