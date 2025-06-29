// Tokenizer and related types extracted from ML.ts
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

export type PipelineError = {
    type: 'ERROR';
    stage: string;
    message: string;
    details?: any;
};

export function isPipelineError(obj: any): obj is PipelineError {
    return obj && obj.type === 'ERROR';
}

export class Tokenizer {
    private readonly IS_NUMBER  = /^-?[0-9][0-9_]*(\.[0-9]+)?$/;
    private readonly IS_STRING  = /^"[^"\n]*"|'[^'\n]*'$/;
    private readonly IS_BOOLEAN = /^(true|false)$/;
    private readonly IS_SYMBOL  = /^[a-zA-Z_+\-*/?!<>=][a-zA-Z0-9_+\-*/?!<>=]*$/;
    private readonly SPLITTER   = /\(|\)|"[^"\n]*"|'[^'\n]*'|[^\s\(\)#]+/g;

    async *run(source: AsyncGenerator<string, void, void>): AsyncGenerator<Token | PipelineError, void, void> {
        let sequence_id = 0;
        for await (const chunk of source) {
            if (chunk.trim() === '') continue;
            const cleanChunk = chunk.split('#')[0];
            if (cleanChunk.trim() === '') continue;
            let match;
            this.SPLITTER.lastIndex = 0;
            while ((match = this.SPLITTER.exec(cleanChunk)) !== null) {
                const m = match[0] as string;
                try {
                    if (m === '(') {
                        yield { type: 'LPAREN', source: m, sequence_id: ++sequence_id };
                    } else if (m === ')') {
                        yield { type: 'RPAREN', source: m, sequence_id: ++sequence_id };
                    } else if (this.IS_STRING.test(m)) {
                        yield { type: 'STRING', source: m.slice(1, -1), sequence_id: ++sequence_id };
                    } else if (this.IS_NUMBER.test(m)) {
                        yield { type: 'NUMBER', source: m, sequence_id: ++sequence_id };
                    } else if (this.IS_BOOLEAN.test(m)) {
                        yield { type: 'BOOLEAN', source: m, sequence_id: ++sequence_id };
                    } else if (this.IS_SYMBOL.test(m)) {
                        if (m.includes('(') || m.includes(')')) {
                            yield { type: 'ERROR', stage: 'Tokenizer', message: `Symbol contains parenthesis: ${m}` };
                        } else {
                            yield { type: 'SYMBOL', source: m, sequence_id: ++sequence_id };
                        }
                    } else if (/^"[^"\n]*$/.test(m) || /^'[^'\n]*$/.test(m)) {
                        yield { type: 'ERROR', stage: 'Tokenizer', message: `Unclosed quoted string: ${m}` };
                    } else {
                        yield { type: 'ERROR', stage: 'Tokenizer', message: `Unrecognized token: ${m}` };
                    }
                } catch (e) {
                    yield { type: 'ERROR', stage: 'Tokenizer', message: (e as Error).message };
                }
            }
        }
    }
}
