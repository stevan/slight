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
    LetNode
} from './AST.js';
import * as fs from 'fs';
import * as path from 'path';

export class Interpreter {
    public functions : Map<string, { params: string[], body: ASTNode }> = new Map();
    public builtins  : Map<string, Function>    = new Map();
    public bindings  : Map<string, any>         = new Map();
    private loadingFiles : Set<string> = new Set();  // Track files being loaded
    private currentFile : string | undefined;  // Current file for relative path resolution
    private includePaths : string[] = [];  // Include directories for file resolution

    constructor() {
        this.initBuiltins();
    }

    setIncludePaths(paths: string[]): void {
        this.includePaths = paths;
    }

    setCurrentFile(filepath: string): void {
        this.currentFile = filepath;
    }

    async *run(source: ASTStream): OutputStream {
        for await (const node of source) {
            if (isPipelineError(node)) {
                yield { type: OutputHandle.ERROR, value : node };
                continue;
            }
            try {
                const result = await node.evaluate(this, new Map());
                if (node instanceof DefNode) {
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

        // Map operations
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

        // File operations
        this.builtins.set('read-file', (filepath: string) => {
            return fs.readFileSync(filepath, 'utf8');
        });

        this.builtins.set('write-file!', (filepath: string, content: string) => {
            fs.writeFileSync(filepath, content, 'utf8');
            return true;
        });

        this.builtins.set('file-exists?', (filepath: string) => {
            return fs.existsSync(filepath);
        });

        this.builtins.set('delete-file!', (filepath: string) => {
            fs.unlinkSync(filepath);
            return true;
        });

        this.builtins.set('resolve-path', (filepath: string, base?: string) => {
            if (base) {
                return path.resolve(path.dirname(base), filepath);
            }
            return path.resolve(filepath);
        });

        // JSON operations
        this.builtins.set('json-parse', (str: string) => JSON.parse(str));
        this.builtins.set('json-stringify', (obj: any) => JSON.stringify(obj));

        // System operations
        this.builtins.set('get-env', (name: string) => process.env[name] ?? null);
        this.builtins.set('exit', (code: number = 0) => process.exit(code));

        // Include - special async builtin
        this.builtins.set('include', async (filepath: string) => {
            // Try to resolve the file in various locations
            let resolvedPath: string | null = null;
            const pathsToTry: string[] = [];

            // 1. Try relative to current file (if we're currently in a file)
            if (this.currentFile) {
                const relativeToFile = path.resolve(path.dirname(this.currentFile), filepath);
                pathsToTry.push(relativeToFile);
                if (fs.existsSync(relativeToFile)) {
                    resolvedPath = relativeToFile;
                }
            }

            // 2. Try each include path
            if (!resolvedPath) {
                for (const includePath of this.includePaths) {
                    const pathInInclude = path.resolve(includePath, filepath);
                    pathsToTry.push(pathInInclude);
                    if (fs.existsSync(pathInInclude)) {
                        resolvedPath = pathInInclude;
                        break;
                    }
                }
            }

            // 3. Try as absolute path or relative to cwd
            if (!resolvedPath) {
                const absolutePath = path.resolve(filepath);
                pathsToTry.push(absolutePath);
                if (fs.existsSync(absolutePath)) {
                    resolvedPath = absolutePath;
                }
            }

            // If still not found, throw an error
            if (!resolvedPath) {
                const searchedPaths = pathsToTry.map(p => `  - ${p}`).join('\n');
                throw new Error(`File not found: ${filepath}\nSearched in:\n${searchedPaths}`);
            }

            // Check for circular dependencies
            if (this.loadingFiles.has(resolvedPath)) {
                throw new Error(`Circular dependency detected: ${resolvedPath}`);
            }

            // Mark as loading
            this.loadingFiles.add(resolvedPath);
            const previousFile = this.currentFile;
            this.currentFile = resolvedPath;

            try {
                // Read the file
                const content = fs.readFileSync(resolvedPath, 'utf8');

                // Run it through the pipeline
                const { Tokenizer } = await import('./Tokenizer.js');
                const { Parser } = await import('./Parser.js');

                const tokenizer = new Tokenizer();
                const parser = new Parser();

                // Create a simple string source
                async function* stringSource() {
                    yield content;
                }

                const tokens = tokenizer.run(stringSource());
                const asts = parser.run(tokens);

                // Evaluate all expressions and return the last one
                let lastResult: any = null;
                for await (const node of asts) {
                    if (isPipelineError(node)) {
                        throw new Error(`Error in ${resolvedPath}: ${node.message}`);
                    }
                    lastResult = await node.evaluate(this, new Map());
                }

                return lastResult;
            } finally {
                // Clean up
                this.loadingFiles.delete(resolvedPath);
                this.currentFile = previousFile;
            }
        });
    }
}
