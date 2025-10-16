import { isPipelineError } from './Types.js';
import { ASTNode } from './AST.js';
import * as fs from 'fs';
import * as path from 'path';
import { ProcessRuntime, ParentState } from './ProcessRuntime.js';
import { CoreInterpreter } from './CoreInterpreter.js';

export class Interpreter extends CoreInterpreter {
    private loadingFiles : Set<string> = new Set();  // Track files being loaded
    private currentFile : string | undefined;  // Current file for relative path resolution
    private includePaths : string[] = [];  // Include directories for file resolution

    constructor() {
        super();
    }

    setIncludePaths(paths: string[]): void {
        this.includePaths = paths;
    }

    setCurrentFile(filepath: string): void {
        this.currentFile = filepath;
    }

    /**
     * Serialize a value to Slight code string for spawning
     */
    private serializeValue(value: any): string {
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

    protected override initBuiltins(): void {
        // Call parent to get core builtins
        super.initBuiltins();

        // Add map and JSON builtins
        this.addMapBuiltins();
        this.addJSONBuiltins();

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

        // System operations
        this.builtins.set('get-env', (name: string) => process.env[name] ?? null);
        this.builtins.set('exit', (code: number = 0) => process.exit(code));

        // Process operations
        const runtime = ProcessRuntime.getInstance();

        this.builtins.set('spawn', (target: any, ...args: any[]) => {
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
