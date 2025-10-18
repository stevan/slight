import { SourceStream, TokenStream } from './Types.js';

// Enhanced token with location
export interface TokenWithLocation {
    type: string;
    source: string;
    sequence_id: number;
    line: number;
    column: number;
    length: number;
}

export class TokenizerWithLocation {
    private readonly IS_NUMBER  = /^-?[0-9][0-9_]*(\.[0-9]+)?$/;
    private readonly IS_STRING  = /^"(?:[^"\\]|\\.)*"$/;
    private readonly IS_BOOLEAN = /^(true|false)$/;
    private readonly IS_SYMBOL  = /^[a-zA-Z_+\-*/?!<>=:.][a-zA-Z0-9_+\-*/?!<>=:.]*$/;
    private readonly SPLITTER   = /\(|\)|'|"(?:[^"\\]|\\.)*"|[^\s\(\)';]+/g;

    async *run(source: SourceStream): AsyncGenerator<TokenWithLocation | any> {
        let sequence_id = 0;
        let lineNumber = 1;
        let lineStart = 0;

        for await (const chunk of source) {
            if (chunk.trim() === '') continue;

            // Track line numbers
            const lines = chunk.split('\n');

            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];
                const cleanLine = line.split(';')[0];
                if (cleanLine.trim() === '') {
                    lineNumber++;
                    lineStart = 0;
                    continue;
                }

                let match;
                this.SPLITTER.lastIndex = 0;

                while ((match = this.SPLITTER.exec(cleanLine)) !== null) {
                    const m = match[0] as string;
                    const column = match.index + 1;

                    try {
                        const baseToken = {
                            source: m,
                            sequence_id: ++sequence_id,
                            line: lineNumber + lineIndex,
                            column: column,
                            length: m.length
                        };

                        if (m === '(') {
                            yield { type: 'LPAREN', ...baseToken };
                        } else if (m === ')') {
                            yield { type: 'RPAREN', ...baseToken };
                        } else if (m === "'") {
                            yield { type: 'QUOTE', ...baseToken };
                        } else if (this.IS_STRING.test(m)) {
                            yield { type: 'STRING', ...baseToken, source: m.slice(1, -1) };
                        } else if (this.IS_NUMBER.test(m)) {
                            yield { type: 'NUMBER', ...baseToken };
                        } else if (this.IS_BOOLEAN.test(m)) {
                            yield { type: 'BOOLEAN', ...baseToken };
                        } else if (this.IS_SYMBOL.test(m)) {
                            yield { type: 'SYMBOL', ...baseToken };
                        } else if (/^"[^"\n]*$/.test(m)) {
                            yield {
                                type: 'ERROR',
                                stage: 'Tokenizer',
                                message: `Unclosed quoted string: ${m}`,
                                line: lineNumber + lineIndex,
                                column: column
                            };
                        } else {
                            yield {
                                type: 'ERROR',
                                stage: 'Tokenizer',
                                message: `Unrecognized token: ${m}`,
                                line: lineNumber + lineIndex,
                                column: column
                            };
                        }
                    } catch (e) {
                        yield {
                            type: 'ERROR',
                            stage: 'Tokenizer',
                            message: (e as Error).message,
                            line: lineNumber + lineIndex,
                            column: column
                        };
                    }
                }
            }

            lineNumber += lines.length - 1;
        }
    }
}

// Error formatter with source context
export class ErrorFormatter {
    static format(error: any, sourceCode?: string): string {
        if (!error.line || !error.column) {
            return `${error.stage} Error: ${error.message}`;
        }

        let result = `\n${error.stage} Error at line ${error.line}, column ${error.column}:\n`;

        if (sourceCode) {
            const lines = sourceCode.split('\n');
            const errorLine = lines[error.line - 1];

            if (errorLine) {
                result += `  ${errorLine}\n`;
                result += `  ${' '.repeat(error.column - 1)}${'~'.repeat(error.length || 1)}\n`;
            }
        }

        result += `  ${error.message}`;

        return result;
    }
}