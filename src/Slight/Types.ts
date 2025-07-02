// -----------------------------------------------------------------------------
// Pipeline errors
// -----------------------------------------------------------------------------

export type PipelineError = {
    type     : 'ERROR';
    stage    : string;
    message  : string;
    details? : any;
};

export function isPipelineError(obj: any): obj is PipelineError {
    return obj && obj.type === 'ERROR';
}

// -----------------------------------------------------------------------------
// Tokenizer types
// -----------------------------------------------------------------------------

export type TokenType =
    | 'STRING'
    | 'NUMBER'
    | 'BOOLEAN'
    | 'SYMBOL'
    | 'LPAREN'
    | 'RPAREN';

export interface Token {
    type        : TokenType;
    source      : string;
    sequence_id : number;
}

// -----------------------------------------------------------------------------
// Parser Types
// -----------------------------------------------------------------------------

export type CaseClause = { test : ASTNode, result : ASTNode };

export type ASTNode =
  | { type: 'NUMBER',  value    : number }
  | { type: 'STRING',  value    : string }
  | { type: 'BOOLEAN', value    : boolean }
  | { type: 'SYMBOL',  name     : string }
  | { type: 'LIST',    elements : ASTNode[] }
  | { type: 'QUOTE',   expr     : ASTNode }
  | { type: 'COND',    clauses  : CaseClause[], elseClause?: ASTNode | undefined }
  | { type: 'DEF',     name     : string, params: string[], body: ASTNode };

// -----------------------------------------------------------------------------
// Compiler types
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Interpreter types
// -----------------------------------------------------------------------------

export enum OutputHandle {
    STDOUT = '🆗',
    INFO   = '🌈',
    WARN   = '⚡️',
    ERROR  = '💔',
    DEBUG  = '💩',
}

export interface OutputToken {
    type  : OutputHandle,
    value : any | PipelineError
}

// -----------------------------------------------------------------------------
// Pipeline stages
// -----------------------------------------------------------------------------

export type SourceStream   = AsyncGenerator<string,                         void, void>;
export type TokenStream    = AsyncGenerator<Token          | PipelineError, void, void>;
export type ASTStream      = AsyncGenerator<ASTNode        | PipelineError, void, void>;
export type OutputStream   = AsyncGenerator<OutputToken,                    void, void>;

// -----------------------------------------------------------------------------
// Source & Sink
// -----------------------------------------------------------------------------

export interface OutputSink {
    run(source: OutputStream) : Promise<void>;
}

export interface InputSource {
    run() : SourceStream;
}

// -----------------------------------------------------------------------------






