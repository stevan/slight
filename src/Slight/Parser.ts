// -----------------------------------------------------------------------------
// Token & Location Types
// -----------------------------------------------------------------------------

export type Location = {
  line   : number;   // 1-based line number
  column : number;   // 1-based column number
  offset : number;   // 0-based character offset in source
  length : number;   // length of the token
};

export type Token = {
  value : string;
  loc   : Location;
};

export type ParseNode = Token | ParseNode[];

// -----------------------------------------------------------------------------
// Tokenizer with Location Tracking
// -----------------------------------------------------------------------------

function tokenize(source: string): Token[] {
    const SPLITTER = /\(|\)|'|%|"(?:[^"\\]|\\.)*"|[^\s\(\)'%;]+/g;
    const tokens: Token[] = [];

    let match: RegExpExecArray | null;
    while ((match = SPLITTER.exec(source)) !== null) {
      const offset = match.index;
      const value  = match[0];

      // Calculate line and column from offset
      const beforeMatch = source.slice(0, offset);
      const lines       = beforeMatch.split('\n');
      const line        = lines.length;
      const column      = lines[lines.length - 1].length + 1;

      tokens.push({
          value,
          loc: { line, column, offset, length: value.length }
      });
    }

    return tokens;
}

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

export function parse(source: string): ParseNode[] {

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
    let tokens = tokenize(source);

    while (tokens.length > 0) {
      const [expr, remaining] = parseTokens(tokens);
      exprs.push(expr);
      tokens = remaining;
    }

    return exprs;
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
        line:   first.line,
        column: first.column,
        offset: first.offset,
        length: (last.offset + last.length) - first.offset
    };
}
