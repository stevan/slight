
import {
    SourceStream,
    TokenStream,
    ASTStream,
    CompiledStream,
    OutputStream
} from './Types.js';


export async function* MonitorOutputStream (source: OutputStream) : OutputStream {
    for await (const src of source) {
        console.log('  OUTPUT:', src);
        yield src;
    }
}

export async function* MonitorCompiledStream (source: CompiledStream) : CompiledStream {
    for await (const src of source) {
        console.log('COMPILER:', src);
        yield src;
    }
}

export async function* MonitorASTStream (source: ASTStream) : ASTStream {
    for await (const src of source) {
        console.log('  PARSER:', src);
        yield src;
    }
}

export async function* MonitorTokenStream (source: TokenStream) : TokenStream {
    for await (const src of source) {
        console.log('  TOKENS:', src);
        yield src;
    }
}

export async function* MonitorSourceStream (source: SourceStream) : SourceStream {
    for await (const src of source) {
        console.log('  SOURCE:', src);
        yield src;
    }
}
