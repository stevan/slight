import {
    ASTNode,
    PipelineError, isPipelineError,
    OutputToken,
    OutputStream,
    OutputHandle
} from './Types.js';

export class Interpreter {
    private functions : Map<string, { params: string[], body: ASTNode }> = new Map();
    private builtins  : Map<string, Function>    = new Map();

    constructor() {
        this.initBuiltins();
    }

    async *run(source: AsyncGenerator<ASTNode | PipelineError, void, void>): OutputStream {
        for await (const node of source) {
            if (isPipelineError(node)) {
                yield { type: OutputHandle.ERROR, value : node };
                continue;
            }
            try {
                if (node.type === 'DEF') {
                    this.functions.set(node.name, { params: node.params, body: node.body });
                    yield { type: OutputHandle.INFO, value : true };
                } else {
                    yield { type: OutputHandle.STDOUT, value : this.evaluate(node, new Map()) };
                }
            } catch (e) {
                yield {
                    type  : OutputHandle.ERROR,
                    value : {
                        type    : 'ERROR',
                        stage   : 'Interpreter',
                        message : (e as Error).message
                    }
                };
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
            case 'CALL':
                if (node.elements.length === 0) {
                    return [];
                }
                const func = this.evaluate(node.elements[0], params);
                const args = node.elements.slice(1).map(arg => this.evaluate(arg, params));
                if (typeof func === 'function') {
                    return func(...args);
                } else if (func && typeof func === 'object' && 'params' in func && 'body' in func) {
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
            case 'DEF':
                // DEF nodes should not be evaluated directly
                return undefined;
            default:
                throw new Error(`Unknown AST node type: ${(node as any).type}`);
        }
    }

    private callUserFunction(func: { params: string[], body: ASTNode }, args: any[]): any {
        if (args.length !== func.params.length) {
            throw new Error(`Wrong number of arguments: expected ${func.params.length}, got ${args.length}`);
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
            case 'CALL':
                return ast.elements.map(elem => this.astToValue(elem));
            default:
                return ast;
        }
    }

    private initBuiltins(): void {
        this.builtins.set('+', (...args: number[]) => args.reduce((a, b) => a + b, 0));
        this.builtins.set('-', (a: number, ...rest: number[]) => rest.length === 0 ? -a : rest.reduce((acc, b) => acc - b, a));
        this.builtins.set('*', (...args: number[]) => args.reduce((a, b) => a * b, 1));
        this.builtins.set('/', (a: number, b: number) => a / b);
        this.builtins.set('mod', (a: number, b: number) => a % b);
        this.builtins.set('==', (a: any, b: any) => a == b);
        this.builtins.set('!=', (a: any, b: any) => a != b);
        this.builtins.set('<', (a: number, b: number) => a < b);
        this.builtins.set('>', (a: number, b: number) => a > b);
        this.builtins.set('<=', (a: number, b: number) => a <= b);
        this.builtins.set('>=', (a: number, b: number) => a >= b);
        this.builtins.set('list', (...args: any[]) => args);
        this.builtins.set('head', (lst: any[]) => lst.length > 0 ? lst[0] : undefined);
        this.builtins.set('tail', (lst: any[]) => lst.slice(1));
        this.builtins.set('cons', (item: any, lst: any[]) => [item, ...lst]);
        this.builtins.set('empty?', (lst: any[]) => lst.length === 0);
        this.builtins.set('and', (...args: any[]) => args.every(x => x));
        this.builtins.set('or', (...args: any[]) => args.some(x => x));
        this.builtins.set('not', (x: any) => !x);
    }
}
