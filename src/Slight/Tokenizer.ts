import {
    SourceStream,
    TokenStream,
}  from './Types.js';

export class Tokenizer {
    private readonly IS_NUMBER  = /^-?[0-9][0-9_]*(\.[0-9]+)?$/;
    private readonly IS_STRING  = /^"(?:[^"\\]|\\.)*"$/;
    private readonly IS_BOOLEAN = /^(true|false)$/;
    private readonly IS_SYMBOL  = /^[a-zA-Z_+\-*/?!<>=:.][a-zA-Z0-9_+\-*/?!<>=:.]*$/;
    private readonly SPLITTER   = /\(|\)|'|"(?:[^"\\]|\\.)*"|[^\s\(\)';]+/g;

    async *run(source: SourceStream): TokenStream {
        let sequence_id = 0;
        let currentLine = 1;

        for await (const chunk of source) {
            if (chunk.trim() === '') continue;

            // Process line by line to track line numbers
            const lines = chunk.split('\n');

            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];
                const cleanLine = line.split(';')[0];

                if (cleanLine.trim() !== '') {
                    let match;
                    this.SPLITTER.lastIndex = 0;
                    while ((match = this.SPLITTER.exec(cleanLine)) !== null) {
                        const m = match[0] as string;
                        const column = match.index + 1;
                    try {
                        if (m === '(') {
                            yield { type: 'LPAREN', source: m, sequence_id: ++sequence_id, line: currentLine, column };
                        } else if (m === ')') {
                            yield { type: 'RPAREN', source: m, sequence_id: ++sequence_id, line: currentLine, column };
                        } else if (m === "'") {
                            yield { type: 'QUOTE', source: m, sequence_id: ++sequence_id, line: currentLine, column };
                        } else if (this.IS_STRING.test(m)) {
                            yield { type: 'STRING', source: m.slice(1, -1), sequence_id: ++sequence_id, line: currentLine, column };
                        } else if (this.IS_NUMBER.test(m)) {
                            yield { type: 'NUMBER', source: m, sequence_id: ++sequence_id, line: currentLine, column };
                        } else if (this.IS_BOOLEAN.test(m)) {
                            yield { type: 'BOOLEAN', source: m, sequence_id: ++sequence_id, line: currentLine, column };
                        } else if (this.IS_SYMBOL.test(m)) {
                            if (m.includes('(') || m.includes(')')) {
                                yield { type: 'ERROR', stage: 'Tokenizer', message: `Symbol contains parenthesis: ${m}`, details: { line: currentLine, column } };
                            } else {
                                yield { type: 'SYMBOL', source: m, sequence_id: ++sequence_id, line: currentLine, column };
                            }
                        } else if (/^"[^"\n]*$/.test(m)) {
                            yield { type: 'ERROR', stage: 'Tokenizer', message: `Unclosed quoted string: ${m}`, details: { line: currentLine, column } };
                        } else {
                            yield { type: 'ERROR', stage: 'Tokenizer', message: `Unrecognized token: ${m}`, details: { line: currentLine, column } };
                        }
                    } catch (e) {
                        yield { type: 'ERROR', stage: 'Tokenizer', message: (e as Error).message, details: { line: currentLine, column } };
                    }
                }
            }

                // Move to next line (except for last line if it's not complete)
                if (lineIndex < lines.length - 1 || lines[lineIndex].trim() !== '') {
                    currentLine++;
                }
            }
        }
    }
}
