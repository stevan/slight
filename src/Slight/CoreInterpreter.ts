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
    private loggingEnabled : boolean            = true;

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
        // Core arithmetic operations (no namespace - fundamental)
        this.builtins.set('+', (...args: number[]) => args.reduce((a, b) => a + b, 0));
        this.builtins.set('-', (a: number, ...rest: number[]) => rest.length === 0 ? -a : rest.reduce((acc, b) => acc - b, a));
        this.builtins.set('*', (...args: number[]) => args.reduce((a, b) => a * b, 1));
        this.builtins.set('/', (a: number, b: number) => a / b);

        // Core comparison operations (no namespace - fundamental)
        this.builtins.set('==', (a: any, b: any) => a == b);
        this.builtins.set('!=', (a: any, b: any) => a != b);
        this.builtins.set('<', (a: number, b: number) => a < b);
        this.builtins.set('>', (a: number, b: number) => a > b);
        this.builtins.set('<=', (a: number, b: number) => a <= b);
        this.builtins.set('>=', (a: number, b: number) => a >= b);

        // Core boolean operations (no namespace - fundamental)
        this.builtins.set('and', (...args: any[]) => args.every(x => x));
        this.builtins.set('or', (...args: any[]) => args.some(x => x));
        this.builtins.set('not', (x: any) => !x);

        // Math namespace
        this.builtins.set('math/mod', (a: number, b: number) => a % b);
        this.builtins.set('math/abs', (x: number) => Math.abs(x));
        this.builtins.set('math/floor', (x: number) => Math.floor(x));
        this.builtins.set('math/ceil', (x: number) => Math.ceil(x));
        this.builtins.set('math/round', (x: number) => Math.round(x));
        this.builtins.set('math/trunc', (x: number) => Math.trunc(x));
        this.builtins.set('math/pow', (x: number, y: number) => Math.pow(x, y));
        this.builtins.set('math/sqrt', (x: number) => Math.sqrt(x));
        this.builtins.set('math/exp', (x: number) => Math.exp(x));
        this.builtins.set('math/log', (x: number) => Math.log(x));
        this.builtins.set('math/log10', (x: number) => Math.log10(x));
        this.builtins.set('math/sin', (x: number) => Math.sin(x));
        this.builtins.set('math/cos', (x: number) => Math.cos(x));
        this.builtins.set('math/tan', (x: number) => Math.tan(x));
        this.builtins.set('math/asin', (x: number) => Math.asin(x));
        this.builtins.set('math/acos', (x: number) => Math.acos(x));
        this.builtins.set('math/atan', (x: number) => Math.atan(x));
        this.builtins.set('math/atan2', (y: number, x: number) => Math.atan2(y, x));
        this.builtins.set('math/min', (...args: number[]) => Math.min(...args));
        this.builtins.set('math/max', (...args: number[]) => Math.max(...args));
        this.builtins.set('math/sign', (x: number) => Math.sign(x));
        this.builtins.set('math/random', () => Math.random());
        this.builtins.set('math/pi', () => Math.PI);
        this.builtins.set('math/e', () => Math.E);

        // List namespace
        this.builtins.set('list/create', (...args: any[]) => args);
        this.builtins.set('list/head', (lst: any[]) => lst.length > 0 ? lst[0] : undefined);
        this.builtins.set('list/tail', (lst: any[]) => lst.slice(1));
        this.builtins.set('list/cons', (item: any, lst: any[]) => [item, ...lst]);
        this.builtins.set('list/empty?', (lst: any[]) => lst.length === 0);
        this.builtins.set('list/length', (lst: any[]) => lst.length);
        this.builtins.set('list/nth', (lst: any[], n: number) => lst[n]);
        this.builtins.set('list/append', (...lists: any[][]) => lists.flat());
        this.builtins.set('list/reverse', (lst: any[]) => [...lst].reverse());
        this.builtins.set('list/map', async (fn: any, lst: any[]) => {
            const results = [];
            for (const item of lst) {
                // Check if fn is a user-defined function or closure
                if (typeof fn === 'object' && fn !== null && 'params' in fn && 'body' in fn) {
                    // User-defined function or closure
                    if ('capturedEnv' in fn) {
                        results.push(await this.callClosure(fn, [item]));
                    } else {
                        results.push(await this.callUserFunction(fn, [item]));
                    }
                } else if (typeof fn === 'function') {
                    // Builtin function
                    results.push(await fn(item));
                } else {
                    throw new Error('list/map expects a function');
                }
            }
            return results;
        });
        this.builtins.set('list/filter', async (fn: any, lst: any[]) => {
            const results = [];
            for (const item of lst) {
                let predicate;
                // Check if fn is a user-defined function or closure
                if (typeof fn === 'object' && fn !== null && 'params' in fn && 'body' in fn) {
                    // User-defined function or closure
                    if ('capturedEnv' in fn) {
                        predicate = await this.callClosure(fn, [item]);
                    } else {
                        predicate = await this.callUserFunction(fn, [item]);
                    }
                } else if (typeof fn === 'function') {
                    // Builtin function
                    predicate = await fn(item);
                } else {
                    throw new Error('list/filter expects a function');
                }

                if (predicate) {
                    results.push(item);
                }
            }
            return results;
        });
        this.builtins.set('list/reduce', async (fn: any, init: any, lst: any[]) => {
            let acc = init;
            for (const item of lst) {
                // Check if fn is a user-defined function or closure
                if (typeof fn === 'object' && fn !== null && 'params' in fn && 'body' in fn) {
                    // User-defined function or closure
                    if ('capturedEnv' in fn) {
                        acc = await this.callClosure(fn, [acc, item]);
                    } else {
                        acc = await this.callUserFunction(fn, [acc, item]);
                    }
                } else if (typeof fn === 'function') {
                    // Builtin function
                    acc = await fn(acc, item);
                } else {
                    throw new Error('list/reduce expects a function');
                }
            }
            return acc;
        });
        this.builtins.set('list/take', (lst: any[], n: number) => lst.slice(0, n));
        this.builtins.set('list/drop', (lst: any[], n: number) => lst.slice(n));
        this.builtins.set('list/sort', (lst: any[], fn?: Function) => {
            if (fn) {
                return [...lst].sort((a, b) => fn(a, b));
            }
            return [...lst].sort();
        });
        this.builtins.set('list/includes?', (lst: any[], item: any) => lst.includes(item));
        this.builtins.set('list/flatten', (lst: any[]) => lst.flat(Infinity));

        // String namespace
        this.builtins.set('string/length', (str: string) => str.length);
        this.builtins.set('string/concat', (...strs: string[]) => strs.join(''));
        this.builtins.set('string/substring', (str: string, start: number, end?: number) => str.substring(start, end));
        this.builtins.set('string/slice', (str: string, start: number, end?: number) => str.slice(start, end));
        this.builtins.set('string/index-of', (str: string, search: string, start?: number) => str.indexOf(search, start));
        this.builtins.set('string/last-index-of', (str: string, search: string, start?: number) => str.lastIndexOf(search, start));
        this.builtins.set('string/replace', (str: string, search: string, replace: string) => str.replace(search, replace));
        this.builtins.set('string/replace-all', (str: string, search: string, replace: string) => str.replaceAll(search, replace));
        this.builtins.set('string/split', (str: string, sep: string) => str.split(sep));
        this.builtins.set('string/join', (arr: any[], sep: string) => arr.join(sep));
        this.builtins.set('string/trim', (str: string) => str.trim());
        this.builtins.set('string/trim-start', (str: string) => str.trimStart());
        this.builtins.set('string/trim-end', (str: string) => str.trimEnd());
        this.builtins.set('string/upper', (str: string) => str.toUpperCase());
        this.builtins.set('string/lower', (str: string) => str.toLowerCase());
        this.builtins.set('string/starts-with?', (str: string, search: string) => str.startsWith(search));
        this.builtins.set('string/ends-with?', (str: string, search: string) => str.endsWith(search));
        this.builtins.set('string/includes?', (str: string, search: string) => str.includes(search));
        this.builtins.set('string/char-at', (str: string, index: number) => str.charAt(index));
        this.builtins.set('string/char-code', (str: string, index: number) => str.charCodeAt(index));
        this.builtins.set('string/from-char-code', (...codes: number[]) => String.fromCharCode(...codes));
        this.builtins.set('string/repeat', (str: string, count: number) => str.repeat(count));
        this.builtins.set('string/pad-start', (str: string, len: number, pad: string) => str.padStart(len, pad));
        this.builtins.set('string/pad-end', (str: string, len: number, pad: string) => str.padEnd(len, pad));

        // Timer namespace (works in both Node.js and browser)
        this.builtins.set('timer/timeout', (fn: Function, ms: number) => setTimeout(() => fn(), ms));
        this.builtins.set('timer/interval', (fn: Function, ms: number) => setInterval(() => fn(), ms));
        this.builtins.set('timer/clear', (id: any) => {
            clearTimeout(id);
            clearInterval(id);
            return true;
        });
        this.builtins.set('timer/sleep', (ms: number) => new Promise(resolve => setTimeout(resolve, ms)));

        // Network namespace (fetch is available in Node 18+ and browser)
        this.builtins.set('net/fetch', async (url: string, options?: any) => {
            const response = await fetch(url, options);
            return {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers),
                text: async () => await response.text(),
                json: async () => await response.json()
            };
        });
        this.builtins.set('net/url-encode', (str: string) => encodeURIComponent(str));
        this.builtins.set('net/url-decode', (str: string) => decodeURIComponent(str));

        // Important aliases for backward compatibility
        this.builtins.set('list', this.builtins.get('list/create')!);
        this.builtins.set('head', this.builtins.get('list/head')!);
        this.builtins.set('tail', this.builtins.get('list/tail')!);
        this.builtins.set('cons', this.builtins.get('list/cons')!);
        this.builtins.set('empty?', this.builtins.get('list/empty?')!);
        this.builtins.set('mod', this.builtins.get('math/mod')!);

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

        // Note: warn is defined later as an alias to log/warn

        // Logging functions (conditionally enabled)
        this.builtins.set('log/info', (...args: any[]) => {
            if (!this.loggingEnabled) return null;
            const output = args.map(arg => this.formatForOutput(arg)).join(' ') + '\n';
            this.outputQueue.push({
                type: OutputHandle.INFO,
                value: output
            });
            return null;
        });

        this.builtins.set('log/debug', (...args: any[]) => {
            if (!this.loggingEnabled) return null;
            const output = args.map(arg => this.formatForOutput(arg)).join(' ') + '\n';
            this.outputQueue.push({
                type: OutputHandle.DEBUG,
                value: output
            });
            return null;
        });

        this.builtins.set('log/warn', (...args: any[]) => {
            if (!this.loggingEnabled) return null;
            const output = args.map(arg => this.formatForOutput(arg)).join(' ') + '\n';
            this.outputQueue.push({
                type: OutputHandle.WARN,
                value: output
            });
            return null;
        });

        this.builtins.set('log/error', (...args: any[]) => {
            if (!this.loggingEnabled) return null;
            const output = args.map(arg => this.formatForOutput(arg)).join(' ') + '\n';
            this.outputQueue.push({
                type: OutputHandle.ERROR,
                value: output
            });
            return null;
        });

        // Logging control
        this.builtins.set('log/enable', () => {
            this.loggingEnabled = true;
            return true;
        });

        this.builtins.set('log/disable', () => {
            this.loggingEnabled = false;
            return true;
        });

        // Alias: warn -> log/warn
        this.builtins.set('warn', (...args: any[]) => {
            return this.builtins.get('log/warn')!(...args);
        });

        // Type inspection operations
        this.builtins.set('type/of', (value: any) => {
            return this.getTypeString(value);
        });

        this.builtins.set('type/is?', (value: any, typeName: string) => {
            return this.getTypeString(value) === typeName;
        });

        this.builtins.set('type/assert', (value: any, typeName: string) => {
            const actualType = this.getTypeString(value);
            if (actualType !== typeName) {
                throw new Error(`Type assertion failed: expected ${typeName}, got ${actualType}`);
            }
            return value;
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
     * Get the type string for a value (used by type inspection primitives)
     */
    protected getTypeString(value: any): string {
        // Handle null/undefined as NIL
        if (value === null || value === undefined) {
            return 'NIL';
        }

        // Check if it's an array (LIST or NIL for empty)
        if (Array.isArray(value)) {
            // Empty list is NIL in LISP
            return value.length === 0 ? 'NIL' : 'LIST';
        }

        // Check if it's an error object (from try/catch)
        if (typeof value === 'object' && value !== null &&
            'message' in value && 'type' in value) {
            return 'ERROR';
        }

        // Check if it's a function object (user-defined function or closure)
        if (typeof value === 'object' && value !== null &&
            'params' in value && 'body' in value) {
            return 'FUNCTION';
        }

        // Check for builtin functions
        if (typeof value === 'function') {
            return 'FUNCTION';
        }

        // For primitive types, use JavaScript's typeof and uppercase it
        const jsType = typeof value;
        switch (jsType) {
            case 'number':
                return 'NUMBER';
            case 'string':
                return 'STRING';
            case 'boolean':
                return 'BOOLEAN';
            case 'symbol':
                return 'SYMBOL';
            default:
                // For any other object types we haven't handled
                return 'OBJECT';
        }
    }

    /**
     * Helper method to add map operations - call this from subclass if maps are needed
     */
    protected addMapBuiltins(): void {
        // Map namespace
        this.builtins.set('map/create', () => new Map());
        this.builtins.set('map/get', (map: Map<any, any>, key: any) => map.get(key) ?? null);
        this.builtins.set('map/set!', (map: Map<any, any>, key: any, value: any) => {
            map.set(key, value);
            return map;
        });
        this.builtins.set('map/has?', (map: Map<any, any>, key: any) => map.has(key));
        this.builtins.set('map/delete!', (map: Map<any, any>, key: any) => map.delete(key));
        this.builtins.set('map/keys', (map: Map<any, any>) => Array.from(map.keys()));
        this.builtins.set('map/values', (map: Map<any, any>) => Array.from(map.values()));
        this.builtins.set('map/entries', (map: Map<any, any>) => Array.from(map.entries()));
        this.builtins.set('map/size', (map: Map<any, any>) => map.size);
        this.builtins.set('map/clear!', (map: Map<any, any>) => {
            map.clear();
            return map;
        });
        this.builtins.set('map/merge', (map1: Map<any, any>, map2: Map<any, any>) => {
            return new Map([...map1, ...map2]);
        });
        this.builtins.set('map/from-list', (entries: Array<[any, any]>) => new Map(entries));
    }

    /**
     * Helper method to add JSON operations - call this from subclass if JSON is needed
     */
    protected addJSONBuiltins(): void {
        // JSON namespace
        this.builtins.set('json/parse', (str: string) => JSON.parse(str));
        this.builtins.set('json/stringify', (obj: any, pretty?: boolean) => {
            return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
        });
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

        // Process namespace
        this.builtins.set('process/spawn', async (target: any, ...args: any[]) => {
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

        this.builtins.set('process/send', (pid: number, data: any) => {
            const currentPid = runtime.getCurrentPid(this);
            runtime.send(currentPid, pid, data);
            return true;
        });

        this.builtins.set('process/recv', async (timeout?: number) => {
            const currentPid = runtime.getCurrentPid(this);
            const message = await runtime.recv(currentPid, timeout);
            if (message === null) {
                // Timeout
                return null;
            }
            // Return a list [from data] for easy pattern matching
            return [message.from, message.data];
        });

        this.builtins.set('process/self', () => {
            return runtime.getCurrentPid(this);
        });

        this.builtins.set('process/alive?', (pid: number) => {
            return runtime.isAlive(pid);
        });

        this.builtins.set('process/kill', (pid: number) => {
            return runtime.kill(pid);
        });

        this.builtins.set('process/list', () => {
            return runtime.getProcesses();
        });

        // Aliases for backward compatibility
        this.builtins.set('spawn', this.builtins.get('process/spawn')!);
        this.builtins.set('send', this.builtins.get('process/send')!);
        this.builtins.set('recv', this.builtins.get('process/recv')!);
        this.builtins.set('self', this.builtins.get('process/self')!);
        this.builtins.set('is-alive?', this.builtins.get('process/alive?')!);
        this.builtins.set('kill', this.builtins.get('process/kill')!);
        this.builtins.set('processes', this.builtins.get('process/list')!);
    }
}
