// -----------------------------------------------------------------------------
// SourceCode - holds original source text for context extraction
// -----------------------------------------------------------------------------

const sourceCache = new Map<string, SourceCode>();

export class SourceCode {
    readonly text  : string;
    readonly lines : string[];
    readonly name  : string;  // e.g., "repl", "eval", or filename

    private constructor(text: string, name: string) {
        this.text  = text;
        this.lines = text.split('\n');
        this.name  = name;
    }

    static from(text: string, name: string = '<anonymous>'): SourceCode {
        const key = `${name}:${text}`;
        let cached = sourceCache.get(key);
        if (!cached) {
            cached = new SourceCode(text, name);
            sourceCache.set(key, cached);
        }
        return cached;
    }

    getLine(lineNum: number): string | undefined {
        return this.lines[lineNum - 1];  // 1-based to 0-based
    }

    getContext(loc: Location, linesAround: number = 2): string {
        const result: string[] = [];
        const startLine = Math.max(1, loc.line - linesAround);
        const endLine   = Math.min(this.lines.length, loc.line + linesAround);

        for (let i = startLine; i <= endLine; i++) {
            const line    = this.getLine(i) ?? '';
            const lineNum = i.toString().padStart(4, ' ');
            const marker  = i === loc.line ? '>' : ' ';
            result.push(`${marker}${lineNum} | ${line}`);

            if (i === loc.line) {
                const padding = ' '.repeat(7 + loc.column - 1);
                const underline = '^'.repeat(Math.min(loc.length, line.length - loc.column + 1));
                result.push(`${padding}${underline}`);
            }
        }
        return result.join('\n');
    }

    formatError(loc: Location, msg: string): string {
        return `${this.name}:${loc.line}:${loc.column}: ${msg}\n${this.getContext(loc)}`;
    }
}

// -----------------------------------------------------------------------------
// Token & Location Types
// -----------------------------------------------------------------------------

export type Location = {
    source : SourceCode;
    line   : number;   // 1-based line number
    column : number;   // 1-based column number
    offset : number;   // 0-based character offset in source
    length : number;   // length of the token
};

export type TokenType = 'token' | 'comment';

export type Token = {
    type  : TokenType;
    value : string;
    loc   : Location;
};

export type ParseNode = Token | ParseNode[];

// -----------------------------------------------------------------------------
// Tokenizer with Location Tracking
// -----------------------------------------------------------------------------

function tokenize(src: SourceCode): Token[] {
    // Match: parens, quote, percent, strings, comments, or other atoms
    const SPLITTER = /\(|\)|'|%|"(?:[^"\\]|\\.)*"|;[^\n]*|[^\s\(\)'%;]+/g;
    const tokens: Token[] = [];
    const source = src.text;

    let match: RegExpExecArray | null;
    while ((match = SPLITTER.exec(source)) !== null) {
        const offset = match.index;
        const value  = match[0];

        // Calculate line and column from offset
        const beforeMatch = source.slice(0, offset);
        const lines       = beforeMatch.split('\n');
        const line        = lines.length;
        const column      = lines[lines.length - 1].length + 1;

        const type: TokenType = value.startsWith(';') ? 'comment' : 'token';

        tokens.push({
            type,
            value,
            loc: { source: src, line, column, offset, length: value.length }
        });
    }

    return tokens;
}

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

export type ParseResult = {
    exprs    : ParseNode[];
    comments : Token[];
    source   : SourceCode;
};

export function parse(source: string, name?: string): ParseResult {
    const src = SourceCode.from(source, name);
    const allTokens = tokenize(src);

    // Separate comments from code tokens
    const comments: Token[] = [];
    const codeTokens: Token[] = [];
    for (const tok of allTokens) {
        if (tok.type === 'comment') {
            comments.push(tok);
        } else {
            codeTokens.push(tok);
        }
    }

    const parseTokens = (tokens: Token[]): [ParseNode, Token[]] => {
        const token = tokens[0];
        if (token === undefined) throw new Error('Unexpected end of input');

        const rest = tokens.slice(1);

        if (token.value === '(') {
            return parseList(rest, []);
        }

        if (token.value === "'") {
            const [quoted, remaining] = parseTokens(rest);
            // Create a synthetic "quote" token at the quote position
            const quoteToken: Token = {
                type: 'token',
                value: 'quote',
                loc: token.loc  // reuse the ' location
            };
            return [[quoteToken, quoted], remaining];
        }

        if (token.value === "%") {
            const [hash, remaining] = parseTokens(rest);
            if (!Array.isArray(hash)) throw new Error(`Expected hash body to be Array, not ${hash.constructor.name}`);

            // Create a synthetic "hash" token at the quote position
            const hashToken: Token = {
                type: 'token',
                value: 'hash',
                loc: token.loc  // reuse the % location
            };

            return [[hashToken, ...hash], remaining];
        }

        return [token, rest];
    };

    const parseList = (tokens: Token[], acc: ParseNode[]): [ParseNode[], Token[]] => {
        if (tokens[0]?.value === ')') {
            return [acc, tokens.slice(1)];
        }
        const [expr, remaining] = parseTokens(tokens);
        return parseList(remaining, [...acc, expr]);
    };

    const exprs: ParseNode[] = [];
    let tokens = codeTokens;

    while (tokens.length > 0) {
        const [expr, remaining] = parseTokens(tokens);
        exprs.push(expr);
        tokens = remaining;
    }

    return { exprs, comments, source: src };
}

// -----------------------------------------------------------------------------
// Utility: Check if a ParseNode is a Token
// -----------------------------------------------------------------------------

export function isToken(node: ParseNode): node is Token {
    return !Array.isArray(node) && typeof node === 'object' && 'value' in node;
}

// -----------------------------------------------------------------------------
// Utility: Get location span for a ParseNode (including nested)
// -----------------------------------------------------------------------------

export function getSpan(node: ParseNode): Location | null {
    if (isToken(node)) {
        return node.loc;
    }
    if (node.length === 0) return null;

    const first = getSpan(node[0]);
    const last  = getSpan(node[node.length - 1]);

    if (!first || !last) return null;

    return {
        source: first.source,
        line:   first.line,
        column: first.column,
        offset: first.offset,
        length: (last.offset + last.length) - first.offset
    };
}
