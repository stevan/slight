import {
    PipelineError, isPipelineError,
    ASTStream,
    OutputToken,
    OutputStream,
    OutputHandle
} from './Types.js';
import {
    ASTNode,
    NumberNode,
    StringNode,
    BooleanNode,
    SymbolNode,
    CallNode,
    QuoteNode,
    CondNode,
    DefNode,
    DefMacroNode,
    SetNode,
    LetNode
} from './AST.js';

/**
 * Base interpreter class with core functionality shared between all interpreter implementations
 */
export class CoreInterpreter {
    public functions : Map<string, { params: string[], body: ASTNode }> = new Map();
    public macros    : Map<string, { params: string[], body: ASTNode }> = new Map();
    public builtins  : Map<string, Function>    = new Map();
    public bindings  : Map<string, any>         = new Map();

    constructor() {
        this.initBuiltins();
    }

    async *run(source: ASTStream): OutputStream {
        for await (const node of source) {
            if (isPipelineError(node)) {
                yield { type: OutputHandle.ERROR, value : node };
                continue;
            }
            try {
                const result = await node.evaluate(this, new Map());
                if (node instanceof DefNode || node instanceof DefMacroNode || node instanceof SetNode) {
                    yield { type: OutputHandle.INFO, value: result };
                } else {
                    yield { type: OutputHandle.STDOUT, value: result };
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

    public callUserFunction(func: { params: string[], body: ASTNode }, args: any[]): Promise<any> {
        if (args.length !== func.params.length) {
            throw new Error(`Wrong number of arguments: expected ${func.params.length}, got ${args.length}`);
        }
        const localParams = new Map<string, any>();
        for (let i = 0; i < func.params.length; i++) {
            localParams.set(func.params[i], args[i]);
        }
        return func.body.evaluate(this, localParams);
    }

    public callClosure(func: { params: string[], body: ASTNode, capturedEnv: Map<string, any> }, args: any[]): Promise<any> {
        if (args.length !== func.params.length) {
            throw new Error(`Wrong number of arguments: expected ${func.params.length}, got ${args.length}`);
        }
        // Start with the captured environment
        const localParams = new Map(func.capturedEnv);
        // Add the function arguments
        for (let i = 0; i < func.params.length; i++) {
            localParams.set(func.params[i], args[i]);
        }
        return func.body.evaluate(this, localParams);
    }

    public bind(name: string, value: any) {
        this.bindings.set(name, value);
    }

    /**
     * Initialize only the core builtins - subclasses should call super.initBuiltins() first
     */
    protected initBuiltins(): void {
        // Core arithmetic operations
        this.builtins.set('+', (...args: number[]) => args.reduce((a, b) => a + b, 0));
        this.builtins.set('-', (a: number, ...rest: number[]) => rest.length === 0 ? -a : rest.reduce((acc, b) => acc - b, a));
        this.builtins.set('*', (...args: number[]) => args.reduce((a, b) => a * b, 1));
        this.builtins.set('/', (a: number, b: number) => a / b);
        this.builtins.set('mod', (a: number, b: number) => a % b);

        // Core comparison operations
        this.builtins.set('==', (a: any, b: any) => a == b);
        this.builtins.set('!=', (a: any, b: any) => a != b);
        this.builtins.set('<', (a: number, b: number) => a < b);
        this.builtins.set('>', (a: number, b: number) => a > b);
        this.builtins.set('<=', (a: number, b: number) => a <= b);
        this.builtins.set('>=', (a: number, b: number) => a >= b);

        // Core list operations
        this.builtins.set('list', (...args: any[]) => args);
        this.builtins.set('head', (lst: any[]) => lst.length > 0 ? lst[0] : undefined);
        this.builtins.set('tail', (lst: any[]) => lst.slice(1));
        this.builtins.set('cons', (item: any, lst: any[]) => [item, ...lst]);
        this.builtins.set('empty?', (lst: any[]) => lst.length === 0);

        // Core boolean operations
        this.builtins.set('and', (...args: any[]) => args.every(x => x));
        this.builtins.set('or', (...args: any[]) => args.some(x => x));
        this.builtins.set('not', (x: any) => !x);
    }

    /**
     * Helper method to add map operations - call this from subclass if maps are needed
     */
    protected addMapBuiltins(): void {
        this.builtins.set('make-map', () => new Map());
        this.builtins.set('map-get', (map: Map<any, any>, key: any) => map.get(key) ?? null);
        this.builtins.set('map-set!', (map: Map<any, any>, key: any, value: any) => {
            map.set(key, value);
            return map;
        });
        this.builtins.set('map-has?', (map: Map<any, any>, key: any) => map.has(key));
        this.builtins.set('map-delete!', (map: Map<any, any>, key: any) => map.delete(key));
        this.builtins.set('map-keys', (map: Map<any, any>) => Array.from(map.keys()));
        this.builtins.set('map-values', (map: Map<any, any>) => Array.from(map.values()));
        this.builtins.set('map-size', (map: Map<any, any>) => map.size);
    }

    /**
     * Helper method to add JSON operations - call this from subclass if JSON is needed
     */
    protected addJSONBuiltins(): void {
        this.builtins.set('json-parse', (str: string) => JSON.parse(str));
        this.builtins.set('json-stringify', (obj: any) => JSON.stringify(obj));
    }
}