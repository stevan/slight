import * as readline from 'readline';

// ============================================================================
// Token Types
// ============================================================================

export type TokenType =
    | 'STRING'
    | 'NUMBER'
    | 'BOOLEAN'
    | 'SYMBOL'
    | 'LPAREN'
    | 'RPAREN'

export interface Token {
    type        : TokenType;
    source      : string;
    sequence_id : number;
}

// ============================================================================
// AST Types
// ============================================================================

export type CaseClause = { test : ASTNode, result : ASTNode }

export type ASTNode =
  | { type: 'NUMBER',  value    : number }
  | { type: 'STRING',  value    : string }
  | { type: 'BOOLEAN', value    : boolean }
  | { type: 'SYMBOL',  name     : string }
  | { type: 'LIST',    elements : ASTNode[] }
  | { type: 'QUOTE',   expr     : ASTNode }
  | { type: 'COND',    clauses  : CaseClause[], elseClause?: ASTNode | undefined };

// ============================================================================
// Compiler Types
// ============================================================================

export interface FunctionDef {
  type   : 'FUNCTION_DEF';
  name   : string;
  params : string[];
  body   : ASTNode;
}

export interface Expression {
  type : 'EXPRESSION';
  ast  : ASTNode;
}

export type CompilerOutput = FunctionDef | Expression;

// ============================================================================
// Error Type
// ============================================================================

export type PipelineError = {
    type: 'ERROR';
    stage: string;
    message: string;
    details?: any;
};

export function isPipelineError(obj: any): obj is PipelineError {
    return obj && obj.type === 'ERROR';
}

// ============================================================================
// REPL
// ============================================================================

export class REPL {
    private $readline : readline.ReadLine;
    private $running  : boolean;

    constructor() {
        this.$running  = false;
        this.$readline = readline.createInterface({
            input  : process.stdin,
            output : process.stdout
        });
    }

    async *run(): AsyncGenerator<string, void, void> {
        this.$running = true;
        while (this.$running) {
            yield new Promise<string>((resolve) => {
                this.$readline.question('? ', (answer: string) => {
                    if (answer === ':q') {
                        this.$running = false;
                        answer = '';
                    }
                    resolve(answer);
                });
            });
        }
        this.$readline.close();
    }
}

// ============================================================================
// Tokenizer
// ============================================================================

export class Tokenizer {
    private readonly IS_NUMBER  = /^-?[0-9][0-9_]*(\.[0-9]+)?$/;
    private readonly IS_STRING  = /^"[^"\n]*"|'[^'\n]*'$/;
    private readonly IS_BOOLEAN = /^(true|false)$/;
    private readonly IS_SYMBOL  = /^[a-zA-Z_+\-*/?!<>=][a-zA-Z0-9_+\-*/?!<>=]*$/;
    private readonly SPLITTER   = /\(|\)|"[^"\n]*"|'[^'\n]*'|[^\s\(\)#]+/g;

    async *run(source: AsyncGenerator<string, void, void>): AsyncGenerator<Token | PipelineError, void, void> {
        let sequence_id = 0;
        for await (const chunk of source) {
            // Skip empty lines
            if (chunk.trim() === '') continue;

            // Handle comments - ignore everything after #
            const cleanChunk = chunk.split('#')[0];
            if (cleanChunk.trim() === '') continue;

            let match;
            this.SPLITTER.lastIndex = 0; // Reset regex state
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
                        // Additional check: symbols must not contain '(' or ')'
                        if (m.includes('(') || m.includes(')')) {
                            yield { type: 'ERROR', stage: 'Tokenizer', message: `Symbol contains parenthesis: ${m}` };
                        } else {
                            yield { type: 'SYMBOL', source: m, sequence_id: ++sequence_id };
                        }
                    } else if (/^"[^"\n]*$/.test(m) || /^'[^'\n]*$/.test(m)) {
                        // Unclosed quoted string
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

// ============================================================================
// Parser
// ============================================================================

export class Parser {
    async *run(source: AsyncGenerator<Token | PipelineError, void, void>): AsyncGenerator<ASTNode | PipelineError, void, void> {
        let stack: { type: 'LIST', elements: ASTNode[] }[] = [];

        for await (const token of source) {
            if (isPipelineError(token)) {
                yield token;
                continue;
            }
            try {
                switch (token.type) {
                    case 'STRING':
                        const stringNode = { type: 'STRING' as const, value: token.source };
                        this.addNode(stringNode, stack);
                        break;

                    case 'NUMBER':
                        const numValue = token.source.includes('.') ? parseFloat(token.source) : parseInt(token.source);
                        const numberNode = { type: 'NUMBER' as const, value: numValue };
                        this.addNode(numberNode, stack);
                        break;

                    case 'BOOLEAN':
                        const boolNode = { type: 'BOOLEAN' as const, value: token.source === 'true' };
                        this.addNode(boolNode, stack);
                        break;

                    case 'SYMBOL':
                        const symbolNode = { type: 'SYMBOL' as const, name: token.source };
                        this.addNode(symbolNode, stack);
                        break;

                    case 'LPAREN':
                        stack.push({ type: 'LIST', elements: [] });
                        break;

                    case 'RPAREN':
                        if (stack.length === 0) {
                            yield { type: 'ERROR', stage: 'Parser', message: 'Unmatched closing parenthesis' };
                            break;
                        }
                        const expr = stack.pop()!;
                        if (stack.length === 0) {
                            yield expr as ASTNode;
                        } else {
                            stack[stack.length - 1].elements.push(expr as ASTNode);
                        }
                        break;

                    default:
                        yield { type: 'ERROR', stage: 'Parser', message: `Unknown token type: ${(token as any).type}` };
                }
            } catch (e) {
                yield { type: 'ERROR', stage: 'Parser', message: (e as Error).message };
            }
        }

        if (stack.length > 0) {
            yield { type: 'ERROR', stage: 'Parser', message: `Unbalanced parentheses - ${stack.length} unclosed expressions` };
        }
    }

    private addNode(node: ASTNode, stack: { type: 'LIST', elements: ASTNode[] }[]): void {
        if (stack.length === 0) {
            throw new Error("Cannot have a literal outside of an expression");
        } else {
            stack[stack.length - 1].elements.push(node);
        }
    }
}

// ============================================================================
// Compiler
// ============================================================================

export class Compiler {
    async *run(source: AsyncGenerator<ASTNode | PipelineError, void, void>): AsyncGenerator<CompilerOutput | PipelineError, void, void> {
        for await (const ast of source) {
            if (isPipelineError(ast)) {
                yield ast;
                continue;
            }
            try {
                if (ast.type === 'LIST' && ast.elements.length > 0) {
                    const firstElement = ast.elements[0];
                    if (firstElement.type === 'SYMBOL') {
                        switch (firstElement.name) {
                            case 'def': {
                                const defResult = this.compileFunctionDef(ast);
                                if (isPipelineError(defResult)) {
                                    yield defResult;
                                } else {
                                    yield defResult;
                                }
                                break;
                            }
                            default: {
                                const exprResult = this.compileExpression(ast);
                                if (isPipelineError(exprResult)) {
                                    yield exprResult;
                                } else {
                                    yield { type: 'EXPRESSION', ast: exprResult };
                                }
                                break;
                            }
                        }
                    } else {
                        const exprResult = this.compileExpression(ast);
                        if (isPipelineError(exprResult)) {
                            yield exprResult;
                        } else {
                            yield { type: 'EXPRESSION', ast: exprResult };
                        }
                    }
                } else {
                    yield { type: 'EXPRESSION', ast };
                }
            } catch (e) {
                yield { type: 'ERROR', stage: 'Compiler', message: (e as Error).message };
            }
        }
    }

    private compileFunctionDef(ast: ASTNode): FunctionDef | PipelineError {
        if (ast.type !== 'LIST' || ast.elements.length !== 4) {
            return { type: 'ERROR', stage: 'Compiler', message: 'Invalid def syntax: expected (def name (params...) body)' };
        }
        const [defSymbol, nameNode, paramsNode, bodyNode] = ast.elements;
        if (nameNode.type !== 'SYMBOL') {
            return { type: 'ERROR', stage: 'Compiler', message: 'Function name must be a symbol' };
        }
        if (paramsNode.type !== 'LIST') {
            return { type: 'ERROR', stage: 'Compiler', message: 'Parameters must be a list' };
        }
        const params: string[] = [];
        for (const param of paramsNode.elements) {
            if (param.type !== 'SYMBOL') {
                return { type: 'ERROR', stage: 'Compiler', message: 'All parameters must be symbols' };
            }
            params.push(param.name);
        }
        return {
            type   : 'FUNCTION_DEF',
            name   : nameNode.name,
            params : params,
            body   : bodyNode
        };
    }

    private compileExpression(ast: ASTNode): ASTNode | PipelineError {
        if (ast.type === 'LIST' && ast.elements.length > 0) {
            const firstElement = ast.elements[0];
            if (firstElement.type === 'SYMBOL') {
                switch (firstElement.name) {
                    case 'cond': {
                        const condResult = this.compileCond(ast);
                        if (isPipelineError(condResult)) {
                            return condResult;
                        }
                        return condResult;
                    }
                    case 'quote': {
                        const quoteResult = this.compileQuote(ast);
                        if (isPipelineError(quoteResult)) {
                            return quoteResult;
                        }
                        return quoteResult;
                    }
                    default:
                        return {
                            type     : 'LIST',
                            elements : ast.elements.map(elem => {
                                const res = this.compileExpression(elem);
                                if (isPipelineError(res)) throw new Error(res.message); // propagate error up
                                return res;
                            })
                        };
                }
            }
            return {
                type     : 'LIST',
                elements : ast.elements.map(elem => {
                    const res = this.compileExpression(elem);
                    if (isPipelineError(res)) throw new Error(res.message); // propagate error up
                    return res;
                })
            };
        }
        return ast;
    }

    private compileCond(ast: ASTNode): ASTNode | PipelineError {
        if (ast.type !== 'LIST' || ast.elements.length < 2) {
            return { type: 'ERROR', stage: 'Compiler', message: 'Invalid cond syntax' };
        }
        const clauses: CaseClause[] = [];
        let elseClause: ASTNode | undefined;
        for (let i = 1; i < ast.elements.length; i++) {
            const clause = ast.elements[i];
            if (clause.type !== 'LIST' || clause.elements.length !== 2) {
                return { type: 'ERROR', stage: 'Compiler', message: 'Each cond clause must be (test result)' };
            }
            const [test, result] = clause.elements;
            const testCompiled = this.compileExpression(test);
            if (isPipelineError(testCompiled)) return testCompiled;
            const resultCompiled = this.compileExpression(result);
            if (isPipelineError(resultCompiled)) return resultCompiled;
            if (test.type === 'SYMBOL' && test.name === 'else') {
                elseClause = resultCompiled;
            } else {
                clauses.push({
                    test   : testCompiled,
                    result : resultCompiled
                });
            }
        }
        return { type: 'COND', clauses, elseClause };
    }

    private compileQuote(ast: ASTNode): ASTNode | PipelineError {
        if (ast.type !== 'LIST' || ast.elements.length !== 2) {
            return { type: 'ERROR', stage: 'Compiler', message: 'Invalid quote syntax: expected (quote expr)' };
        }
        const [quoteSymbol, expr] = ast.elements;
        return { type : 'QUOTE', expr : expr };
    }
}

// ============================================================================
// Interpreter
// ============================================================================

export class Interpreter {
    private functions : Map<string, FunctionDef> = new Map();
    private builtins  : Map<string, Function>    = new Map();

    constructor() {
        this.initBuiltins();
    }

    async *run(source: AsyncGenerator<CompilerOutput | PipelineError, void, void>): AsyncGenerator<any | PipelineError, void, void> {
        for await (const compiled of source) {
            if (isPipelineError(compiled)) {
                yield compiled;
                continue;
            }
            try {
                if (compiled.type === 'FUNCTION_DEF') {
                    this.functions.set(compiled.name, compiled);
                    yield true;
                } else {
                    yield this.evaluate(compiled.ast, new Map());
                }
            } catch (e) {
                yield { type: 'ERROR', stage: 'Interpreter', message: (e as Error).message };
            }
        }
    }

    private evaluate(node: ASTNode, params: Map<string, any>): any {
        switch (node.type) {
            case 'NUMBER':
            case 'STRING':
            case 'BOOLEAN':
                return node.value;

            case 'SYMBOL':
                if (params.has(node.name)) {
                    return params.get(node.name);
                }
                if (this.builtins.has(node.name)) {
                    return this.builtins.get(node.name);
                }
                if (this.functions.has(node.name)) {
                    return this.functions.get(node.name);
                }
                throw new Error(`Undefined symbol: ${node.name}`);

            case 'QUOTE':
                return this.astToValue(node.expr);

            case 'LIST':
                if (node.elements.length === 0) {
                    return [];
                }

                const func = this.evaluate(node.elements[0], params);
                const args = node.elements.slice(1).map(arg => this.evaluate(arg, params));

                if (typeof func === 'function') {
                    return func(...args);
                } else if (func && typeof func === 'object' && func.type === 'FUNCTION_DEF') {
                    return this.callUserFunction(func, args);
                } else {
                    throw new Error(`Not a function: ${node.elements[0]}`);
                }

            case 'COND':
                for (const clause of node.clauses) {
                    const testResult = this.evaluate(clause.test, params);
                    if (testResult) {
                        return this.evaluate(clause.result, params);
                    }
                }
                if (node.elseClause) {
                    return this.evaluate(node.elseClause, params);
                }
                return false;

            default:
                throw new Error(`Unknown AST node type: ${(node as any).type}`);
        }
    }

    private callUserFunction(func: FunctionDef, args: any[]): any {
        if (args.length !== func.params.length) {
            throw new Error(`Wrong number of arguments for ${func.name}: expected ${func.params.length}, got ${args.length}`);
        }

        const localParams = new Map<string, any>();
        for (let i = 0; i < func.params.length; i++) {
            localParams.set(func.params[i], args[i]);
        }

        return this.evaluate(func.body, localParams);
    }

    private astToValue(ast: ASTNode): any {
        switch (ast.type) {
            case 'NUMBER':
            case 'STRING':
            case 'BOOLEAN':
                return ast.value;
            case 'SYMBOL':
                return ast.name;
            case 'LIST':
                return ast.elements.map(elem => this.astToValue(elem));
            default:
                return ast;
        }
    }

    private initBuiltins(): void {
        // Arithmetic
        this.builtins.set('+', (...args: number[]) => args.reduce((a, b) => a + b, 0));
        this.builtins.set('-', (a: number, ...rest: number[]) => rest.length === 0 ? -a : rest.reduce((acc, b) => acc - b, a));
        this.builtins.set('*', (...args: number[]) => args.reduce((a, b) => a * b, 1));
        this.builtins.set('/', (a: number, b: number) => a / b);
        this.builtins.set('%', (a: number, b: number) => a % b);

        // Comparison
        this.builtins.set('=', (a: any, b: any) => a === b);
        this.builtins.set('<', (a: number, b: number) => a < b);
        this.builtins.set('>', (a: number, b: number) => a > b);
        this.builtins.set('<=', (a: number, b: number) => a <= b);
        this.builtins.set('>=', (a: number, b: number) => a >= b);

        // List operations
        this.builtins.set('list', (...args: any[]) => args);
        this.builtins.set('head', (lst: any[]) => lst.length > 0 ? lst[0] : undefined);
        this.builtins.set('tail', (lst: any[]) => lst.slice(1));
        this.builtins.set('cons', (item: any, lst: any[]) => [item, ...lst]);
        this.builtins.set('empty?', (lst: any[]) => lst.length === 0);

        // Logical
        this.builtins.set('and', (...args: any[]) => args.every(x => x));
        this.builtins.set('or', (...args: any[]) => args.some(x => x));
        this.builtins.set('not', (x: any) => !x);
    }
}

// ============================================================================
// Output
// ============================================================================

export class Output {
    async run(source: AsyncGenerator<any | PipelineError, void, void>): Promise<void> {
        for await (const result of source) {
            console.log(this.prettyPrint(result));
        }
    }

    private prettyPrint(value: any): string {
        if (isPipelineError(value)) {
            return `[${value.stage} Error] ${value.message}`;
        }

        if (value === null || value === undefined) {
            return '()';
        }

        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }

        if (typeof value === 'number') {
            return value.toString();
        }

        if (typeof value === 'string') {
            return `"${value}"`;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return '()';
            }
            return `(${value.map(v => this.prettyPrint(v)).join(' ')})`;
        }

        return value.toString();
    }
}

// ============================================================================
// Main
// ============================================================================

// (Moved to bin/repl.ts)
