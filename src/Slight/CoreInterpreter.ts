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
import { ProcessRuntime, ParentState } from './ProcessRuntime.js';

/**
 * Base interpreter class with core functionality shared between all interpreter implementations
 */
export class CoreInterpreter {
    public functions : Map<string, { params: string[], body: ASTNode }> = new Map();
    public macros    : Map<string, { params: string[], body: ASTNode }> = new Map();
    public builtins  : Map<string, Function>    = new Map();
    public bindings  : Map<string, any>         = new Map();
    public outputQueue : OutputToken[]          = [];

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

                // Yield any queued output tokens first (from print/say/warn)
                while (this.outputQueue.length > 0) {
                    yield this.outputQueue.shift()!;
                }

                // Then yield the evaluation result
                if (node instanceof DefNode || node instanceof DefMacroNode || node instanceof SetNode) {
                    yield { type: OutputHandle.INFO, value: result };
                } else {
                    yield { type: OutputHandle.STDOUT, value: result };
                }
            } catch (e) {
                // Flush output queue even on error
                while (this.outputQueue.length > 0) {
                    yield this.outputQueue.shift()!;
                }

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

        // Core I/O operations
        this.builtins.set('print', (...args: any[]) => {
            // Print without newline
            const output = args.map(arg => this.formatForOutput(arg)).join(' ');
            this.outputQueue.push({
                type: OutputHandle.STDOUT,
                value: output
            });
            return null;  // print returns null
        });

        this.builtins.set('say', (...args: any[]) => {
            // Print with newline
            const output = args.map(arg => this.formatForOutput(arg)).join(' ') + '\n';
            this.outputQueue.push({
                type: OutputHandle.STDOUT,
                value: output
            });
            return null;  // say returns null
        });

        this.builtins.set('warn', (...args: any[]) => {
            // Warning with newline
            const output = args.map(arg => this.formatForOutput(arg)).join(' ') + '\n';
            this.outputQueue.push({
                type: OutputHandle.WARN,
                value: output
            });
            return null;  // warn returns null
        });
    }

    /**
     * Format a value for output (used by print/say/warn)
     */
    private formatForOutput(value: any): string {
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
            return value;
        }
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return '()';
            }
            return `(${value.map(v => this.formatForOutput(v)).join(' ')})`;
        }
        return String(value);
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

    /**
     * Serialize a value to Slight code string for spawning
     */
    protected serializeValue(value: any): string {
        if (typeof value === 'number') {
            return String(value);
        } else if (typeof value === 'string') {
            // Escape quotes and backslashes
            const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return `"${escaped}"`;
        } else if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        } else if (value === null || value === undefined) {
            return 'null';
        } else if (Array.isArray(value)) {
            const items = value.map(v => this.serializeValue(v)).join(' ');
            return `(list ${items})`;
        } else if (value instanceof Map) {
            // Can't easily serialize maps, throw error
            throw new Error('Cannot serialize Map for spawn');
        } else {
            throw new Error(`Cannot serialize value for spawn: ${typeof value}`);
        }
    }

    /**
     * Helper method to add process operations - call this from subclass if processes are needed
     */
    protected addProcessBuiltins(): void {
        const runtime = ProcessRuntime.getInstance();

        this.builtins.set('spawn', async (target: any, ...args: any[]) => {
            let code: string;

            if (typeof target === 'string') {
                // Legacy: spawn with code string
                code = target;
            } else if (target && typeof target === 'object' && 'params' in target && 'body' in target) {
                // Function or closure passed
                // Serialize arguments
                const serializedArgs = args.map(arg => this.serializeValue(arg)).join(' ');

                // Find the function name if it exists
                let funcName: string | null = null;
                for (const [name, func] of this.functions.entries()) {
                    if (func === target) {
                        funcName = name;
                        break;
                    }
                }

                if (funcName) {
                    // Named function: just call it
                    code = args.length > 0
                        ? `(${funcName} ${serializedArgs})`
                        : `(${funcName})`;
                } else {
                    // Anonymous function or closure: we'll need to define it inline
                    // For now, throw an error - we can't easily serialize the AST
                    throw new Error('Cannot spawn anonymous function - pass a named function or use code string');
                }
            } else {
                throw new Error('spawn expects a string (code) or function');
            }

            // Clone parent interpreter state
            const parentState: ParentState = {
                functions: new Map(this.functions),
                macros: new Map(this.macros),
                bindings: new Map(this.bindings)
            };

            return runtime.spawn(code, parentState);
        });

        this.builtins.set('send', (pid: number, data: any) => {
            const currentPid = runtime.getCurrentPid(this);
            runtime.send(currentPid, pid, data);
            return true;
        });

        this.builtins.set('recv', async (timeout?: number) => {
            const currentPid = runtime.getCurrentPid(this);
            const message = await runtime.recv(currentPid, timeout);
            if (message === null) {
                // Timeout
                return null;
            }
            // Return a list [from data] for easy pattern matching
            return [message.from, message.data];
        });

        this.builtins.set('self', () => {
            return runtime.getCurrentPid(this);
        });

        this.builtins.set('is-alive?', (pid: number) => {
            return runtime.isAlive(pid);
        });

        this.builtins.set('kill', (pid: number) => {
            return runtime.kill(pid);
        });

        this.builtins.set('processes', () => {
            return runtime.getProcesses();
        });
    }
}