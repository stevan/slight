
import {
    SourceStream,
    TokenStream,
    ASTStream,
    CompiledStream,
    OutputStream
} from './Types.js';


export async function* MonitorOutputStream (source: OutputStream) : OutputStream {
    console.group('... Output');
    for await (const src of source) {
        console.log('  OUTPUT:', src);
        yield src;
    }
    console.groupEnd();
}

export async function* MonitorCompiledStream (source: CompiledStream) : CompiledStream {
    console.group('... Compiled');
    for await (const src of source) {
        console.log('COMPILER:', src);
        yield src;
    }
    console.groupEnd();
}

export async function* MonitorASTStream (source: ASTStream) : ASTStream {
    console.group('... Parsed');
    for await (const src of source) {
        console.log('  PARSER:', src);
        yield src;
    }
    console.groupEnd();
}

export async function* MonitorTokenStream (source: TokenStream) : TokenStream {
    console.group('... Tokenized');
    for await (const src of source) {
        console.log('  TOKENS:', src);
        yield src;
    }
    console.groupEnd();
}

export async function* MonitorSourceStream (source: SourceStream) : SourceStream {
    console.group('... Source');
    for await (const src of source) {
        console.log('  SOURCE:', src);
        yield src;
    }
    console.groupEnd();
}
