import { isPipelineError } from './Types.js';
import { ASTNode } from './AST.js';
import * as fs from 'fs';
import * as path from 'path';
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

    protected override initBuiltins(): void {
        // Call parent to get core builtins
        super.initBuiltins();

        // Add map, JSON, and process builtins
        this.addMapBuiltins();
        this.addJSONBuiltins();
        this.addProcessBuiltins();

        // File system namespace (fs/)
        this.builtins.set('fs/read', (filepath: string) => {
            return fs.readFileSync(filepath, 'utf8');
        });

        this.builtins.set('fs/write!', (filepath: string, content: string) => {
            fs.writeFileSync(filepath, content, 'utf8');
            return true;
        });

        this.builtins.set('fs/append!', (filepath: string, content: string) => {
            fs.appendFileSync(filepath, content, 'utf8');
            return true;
        });

        this.builtins.set('fs/exists?', (filepath: string) => {
            return fs.existsSync(filepath);
        });

        this.builtins.set('fs/delete!', (filepath: string) => {
            fs.unlinkSync(filepath);
            return true;
        });

        this.builtins.set('fs/resolve', (filepath: string, base?: string) => {
            if (base) {
                return path.resolve(path.dirname(base), filepath);
            }
            return path.resolve(filepath);
        });

        this.builtins.set('fs/mkdir!', (dirpath: string, recursive: boolean = true) => {
            fs.mkdirSync(dirpath, { recursive });
            return true;
        });

        this.builtins.set('fs/readdir', (dirpath: string) => {
            return fs.readdirSync(dirpath);
        });

        this.builtins.set('fs/stat', (filepath: string) => {
            const stats = fs.statSync(filepath);
            return {
                size: stats.size,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                mtime: stats.mtime.toISOString(),
                ctime: stats.ctime.toISOString()
            };
        });

        this.builtins.set('fs/copy!', (src: string, dest: string) => {
            fs.copyFileSync(src, dest);
            return true;
        });

        this.builtins.set('fs/move!', (src: string, dest: string) => {
            fs.renameSync(src, dest);
            return true;
        });

        // System namespace (sys/)
        this.builtins.set('sys/env', (name: string) => process.env[name] ?? null);
        this.builtins.set('sys/exit', (code: number = 0) => process.exit(code));
        this.builtins.set('sys/args', () => process.argv.slice(2));
        this.builtins.set('sys/cwd', () => process.cwd());
        this.builtins.set('sys/chdir!', (dir: string) => {
            process.chdir(dir);
            return true;
        });
        this.builtins.set('sys/platform', () => process.platform);
        this.builtins.set('sys/arch', () => process.arch);

        // Backward compatibility aliases for critical file operations
        this.builtins.set('read-file', this.builtins.get('fs/read')!);
        this.builtins.set('write-file!', this.builtins.get('fs/write!')!);
        this.builtins.set('file-exists?', this.builtins.get('fs/exists?')!);
        this.builtins.set('get-env', this.builtins.get('sys/env')!);

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
                const { MacroExpander } = await import('./MacroExpander.js');

                const tokenizer = new Tokenizer();
                const parser = new Parser();
                const macroExpander = new MacroExpander();

                // Create a simple string source
                async function* stringSource() {
                    yield content;
                }

                const tokens = tokenizer.run(stringSource());
                const asts = parser.run(tokens);
                const expanded = macroExpander.run(asts);

                // Evaluate all expressions and return the last one
                let lastResult: any = null;
                for await (const node of expanded) {
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
