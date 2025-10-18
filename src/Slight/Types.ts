// -----------------------------------------------------------------------------
// Parser AST
// -----------------------------------------------------------------------------

import { ASTNode } from './AST.js';

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
    | 'RPAREN'
    | 'QUOTE';

export interface Token {
    type        : TokenType;
    source      : string;
    sequence_id : number;
    line?       : number;
    column?     : number;
}

// -----------------------------------------------------------------------------
// Output types
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

export type SourceStream   = AsyncGenerator<string, void, void>;
export type TokenStream    = AsyncGenerator<Token | PipelineError, void, void>;
export type ASTStream      = AsyncGenerator<ASTNode | PipelineError, void, void>
export type OutputStream   = AsyncGenerator<OutputToken, void, void>;

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






