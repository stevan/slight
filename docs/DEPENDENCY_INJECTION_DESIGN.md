# Dependency Injection Refactoring for Slight

**Date:** 2025-01-02
**Status:** ✅ IMPLEMENTED AND TESTED

**Implementation Date:** 2025-01-02
**Tests:** 33 DI tests (20 unit + 13 integration), all passing
**Files Created:**
- `src/Slight/Dependencies/types.ts` (115 lines)
- `src/Slight/Dependencies/OutputSink.ts` (60 lines)
- `src/Slight/Dependencies/Platform.ts` (280 lines)
- `src/Slight/Dependencies/index.ts` (barrel export)
- `tests/dependencies/output-sink.test.ts` (5 tests)
- `tests/dependencies/platform.test.ts` (15 tests)
- `tests/integration/dependency-injection.test.ts` (13 tests)
- `docs/DI_PLUGIN_GUIDE.md` (comprehensive plugin development guide)

**Next Steps:** See `docs/NEXT_SESSION_PROMPT.md` for implementing TracingInterpreter

## Context

After exploring the functor-based interpreter approach from the Corgi metacircular interpreter docs, we determined that a full functor refactoring would be too invasive for Slight's current architecture. The tight coupling between AST nodes, interpreter state, and builtins makes a complete decomposition impractical.

However, we identified that **Dependency Injection** would provide the key benefits we want (testability, composability, platform flexibility) with minimal disruption to the existing codebase.

## Goals

1. ✅ **Testability** - Inject mock implementations for all I/O operations
2. ✅ **Composability** - Mix and match different implementations
3. ✅ **Platform Flexibility** - Support Node.js, Browser, and Test environments
4. ✅ **Backward Compatibility** - Existing code continues to work
5. ✅ **Incremental Adoption** - Can implement piece by piece

## Non-Goals

- ❌ Full functor-based architecture (too complex)
- ❌ Rewriting AST node evaluation (too invasive)
- ❌ Changing the pipeline structure (already good)

## Design

### Key Dependencies to Extract

1. **OutputSink** - Where print/say/warn output goes
2. **PlatformOperations** - File system, network, timers, system calls
3. **ProcessRuntime** - Actor-style process management

### Core Interfaces

```typescript
// src/Slight/Dependencies/types.ts

import { OutputToken, OutputHandle } from '../Types.js';
import { CoreInterpreter } from '../CoreInterpreter.js';
import { ASTNode } from '../AST.js';
import { ParentState } from '../ProcessRuntime.js';

/**
 * Output sink - where print/say/warn go
 */
export interface OutputSink {
    write(token: OutputToken): void;
}

/**
 * Process runtime - manages actor-style processes
 */
export interface IProcessRuntime {
    spawn(interpreter: CoreInterpreter, target: any, state?: ParentState): Promise<number>;
    send(pid: number, message: any): void;
    recv(pid: number, timeout?: number): Promise<any>;
    isAlive(pid: number): boolean;
    kill(pid: number): void;
    self(): number;
}

/**
 * File system operations (Node.js only)
 */
export interface FileSystemOperations {
    read(path: string): string;
    write(path: string, content: string): void;
    append(path: string, content: string): void;
    exists(path: string): boolean;
    delete(path: string): void;
    resolve(path: string, base?: string): string;
    mkdir(dirpath: string, recursive?: boolean): void;
    readdir(dirpath: string): string[];
    stat(filepath: string): FileStats;
    copy(src: string, dest: string): void;
    move(src: string, dest: string): void;
}

export interface FileStats {
    size: number;
    isFile: boolean;
    isDirectory: boolean;
    mtime: string;
    ctime: string;
}

/**
 * System operations (Node.js only)
 */
export interface SystemOperations {
    env(name: string): string | null;
    exit(code: number): never;
    args(): string[];
    cwd(): string;
    chdir(dir: string): void;
    platform(): string;
    homedir(): string;
    tmpdir(): string;
}

/**
 * Network operations (cross-platform)
 */
export interface NetworkOperations {
    fetch(url: string, options?: any): Promise<{
        status: number;
        text: string;
        json: () => Promise<any>;
    }>;
    urlEncode(str: string): string;
    urlDecode(str: string): string;
}

/**
 * Timer operations (cross-platform)
 */
export interface TimerOperations {
    setTimeout(callback: () => void, ms: number): any;
    clearTimeout(id: any): void;
    setInterval(callback: () => void, ms: number): any;
    clearInterval(id: any): void;
}

/**
 * Platform operations - I/O, filesystem, system calls
 */
export interface PlatformOperations {
    // File system (optional - not all platforms have this)
    fs?: FileSystemOperations;

    // System operations (optional)
    sys?: SystemOperations;

    // Network operations (cross-platform)
    net: NetworkOperations;

    // Timer operations (cross-platform)
    timer: TimerOperations;
}

/**
 * Dependencies that can be injected into interpreter
 */
export interface InterpreterDependencies {
    outputSink?: OutputSink;
    processRuntime?: IProcessRuntime;
    platform?: PlatformOperations;
}
```

## Implementation Plan

### Phase 1: Create Dependency Interfaces and Default Implementations

**Files to Create:**

1. `src/Slight/Dependencies/types.ts` - Core interfaces (see above)
2. `src/Slight/Dependencies/OutputSink.ts` - Output sink implementations
3. `src/Slight/Dependencies/Platform.ts` - Platform implementations
4. `src/Slight/Dependencies/index.ts` - Barrel exports

### Phase 2: Refactor CoreInterpreter

**Changes to `src/Slight/CoreInterpreter.ts`:**

```typescript
// Add imports
import {
    InterpreterDependencies,
    OutputSink,
    IProcessRuntime,
    PlatformOperations
} from './Dependencies/index.js';
import { QueueOutputSink } from './Dependencies/OutputSink.js';
import { NodePlatform } from './Dependencies/Platform.js';

export class CoreInterpreter {
    // Add dependency fields
    protected outputSink: OutputSink;
    protected processRuntime: IProcessRuntime;
    protected platform: PlatformOperations;

    // Modify constructor to accept dependencies
    constructor(deps?: InterpreterDependencies) {
        // Use injected deps or defaults
        this.outputSink = deps?.outputSink ?? new QueueOutputSink(this.outputQueue);
        this.processRuntime = deps?.processRuntime ?? ProcessRuntime.getInstance();
        this.platform = deps?.platform ?? new NodePlatform();

        this.initBuiltins();
    }

    // Refactor initBuiltins to use dependencies
    protected initBuiltins(): void {
        // Core operations (no dependencies)
        this.builtins.set('+', (...args: number[]) => args.reduce((a, b) => a + b, 0));
        // ... etc (unchanged)

        // Operations that use dependencies
        this.addIOBuiltins();
        this.addProcessBuiltins();
        this.addPlatformBuiltins();
    }

    protected addIOBuiltins(): void {
        this.builtins.set('print', (...args: any[]) => {
            const formatted = args.map(arg => this.formatForOutput(arg)).join(' ');
            this.outputSink.write({
                type: OutputHandle.STDOUT,
                value: formatted
            });
        });

        this.builtins.set('say', (...args: any[]) => {
            const formatted = args.map(arg => this.formatForOutput(arg)).join(' ');
            this.outputSink.write({
                type: OutputHandle.STDOUT,
                value: formatted + '\n'
            });
        });

        this.builtins.set('warn', (...args: any[]) => {
            const formatted = args.map(arg => this.formatForOutput(arg)).join(' ');
            this.outputSink.write({
                type: OutputHandle.STDERR,
                value: formatted + '\n'
            });
        });
    }

    protected addProcessBuiltins(): void {
        this.builtins.set('process/spawn', async (target: any, ...args: any[]) => {
            return await this.processRuntime.spawn(this, target, ...args);
        });

        this.builtins.set('process/send', (pid: number, data: any) => {
            this.processRuntime.send(pid, data);
        });

        this.builtins.set('process/recv', async (timeout?: number) => {
            return await this.processRuntime.recv(this.processRuntime.self(), timeout);
        });

        this.builtins.set('process/self', () => this.processRuntime.self());
        this.builtins.set('process/alive?', (pid: number) => this.processRuntime.isAlive(pid));
        this.builtins.set('process/kill', (pid: number) => this.processRuntime.kill(pid));
    }

    protected addPlatformBuiltins(): void {
        // Add fs/ operations if available
        if (this.platform.fs) {
            this.builtins.set('fs/read', (path: string) => this.platform.fs!.read(path));
            this.builtins.set('fs/write', (path: string, content: string) => {
                this.platform.fs!.write(path, content);
                return true;
            });
            this.builtins.set('fs/append', (path: string, content: string) => {
                this.platform.fs!.append(path, content);
                return true;
            });
            this.builtins.set('fs/exists?', (path: string) => this.platform.fs!.exists(path));
            this.builtins.set('fs/delete!', (path: string) => {
                this.platform.fs!.delete(path);
                return true;
            });
            this.builtins.set('fs/resolve', (path: string, base?: string) => {
                return this.platform.fs!.resolve(path, base);
            });
            this.builtins.set('fs/mkdir!', (dirpath: string, recursive: boolean = true) => {
                this.platform.fs!.mkdir(dirpath, recursive);
                return true;
            });
            this.builtins.set('fs/readdir', (dirpath: string) => {
                return this.platform.fs!.readdir(dirpath);
            });
            this.builtins.set('fs/stat', (filepath: string) => {
                return this.platform.fs!.stat(filepath);
            });
            this.builtins.set('fs/copy!', (src: string, dest: string) => {
                this.platform.fs!.copy(src, dest);
                return true;
            });
            this.builtins.set('fs/move!', (src: string, dest: string) => {
                this.platform.fs!.move(src, dest);
                return true;
            });
        }

        // Add sys/ operations if available
        if (this.platform.sys) {
            this.builtins.set('sys/env', (name: string) => this.platform.sys!.env(name));
            this.builtins.set('sys/exit', (code: number = 0) => this.platform.sys!.exit(code));
            this.builtins.set('sys/args', () => this.platform.sys!.args());
            this.builtins.set('sys/cwd', () => this.platform.sys!.cwd());
            this.builtins.set('sys/chdir!', (dir: string) => {
                this.platform.sys!.chdir(dir);
                return true;
            });
            this.builtins.set('sys/platform', () => this.platform.sys!.platform());
            this.builtins.set('sys/homedir', () => this.platform.sys!.homedir());
            this.builtins.set('sys/tmpdir', () => this.platform.sys!.tmpdir());
        }

        // Add net/ operations (always available)
        this.builtins.set('net/fetch', async (url: string, opts?: any) => {
            return await this.platform.net.fetch(url, opts);
        });
        this.builtins.set('net/url-encode', (str: string) => this.platform.net.urlEncode(str));
        this.builtins.set('net/url-decode', (str: string) => this.platform.net.urlDecode(str));

        // Add timer/ operations (always available)
        this.builtins.set('timer/timeout', (fn: any, ms: number) => {
            const wrapped = this.wrapSlightFunction(fn);
            const id = this.platform.timer.setTimeout(async () => {
                this.activeTimeouts.delete(id);
                await wrapped();
            }, ms);
            this.activeTimeouts.add(id);
            return id;
        });

        this.builtins.set('timer/interval', (fn: any, ms: number) => {
            const wrapped = this.wrapSlightFunction(fn);
            return this.platform.timer.setInterval(async () => {
                await wrapped();
            }, ms);
        });

        this.builtins.set('timer/clear', (id: any) => {
            this.activeTimeouts.delete(id);
            this.platform.timer.clearTimeout(id);
            this.platform.timer.clearInterval(id);
        });

        this.builtins.set('timer/sleep', (ms: number) => new Promise(resolve =>
            this.platform.timer.setTimeout(resolve, ms)
        ));
    }
}
```

### Phase 3: Create Implementations

**File: `src/Slight/Dependencies/OutputSink.ts`**

```typescript
import { OutputToken, OutputHandle } from '../Types.js';

export interface OutputSink {
    write(token: OutputToken): void;
}

/**
 * Queue-based output (current behavior - for async generator pipeline)
 */
export class QueueOutputSink implements OutputSink {
    constructor(private queue: OutputToken[]) {}

    write(token: OutputToken): void {
        this.queue.push(token);
    }
}

/**
 * Collecting output sink (for testing)
 */
export class CollectingOutputSink implements OutputSink {
    public outputs: OutputToken[] = [];

    write(token: OutputToken): void {
        this.outputs.push(token);
    }

    getStdout(): string[] {
        return this.outputs
            .filter(t => t.type === OutputHandle.STDOUT)
            .map(t => t.value);
    }

    getStderr(): string[] {
        return this.outputs
            .filter(t => t.type === OutputHandle.STDERR)
            .map(t => t.value);
    }

    getAll(): string[] {
        return this.outputs.map(t => t.value);
    }

    clear(): void {
        this.outputs = [];
    }
}

/**
 * Console output sink (direct to console, bypasses queue)
 */
export class ConsoleOutputSink implements OutputSink {
    write(token: OutputToken): void {
        if (token.type === OutputHandle.STDOUT) {
            process.stdout.write(token.value);
        } else if (token.type === OutputHandle.STDERR) {
            process.stderr.write(token.value);
        } else if (token.type === OutputHandle.ERROR) {
            console.error(token.value);
        }
    }
}
```

**File: `src/Slight/Dependencies/Platform.ts`**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
    PlatformOperations,
    FileSystemOperations,
    SystemOperations,
    NetworkOperations,
    TimerOperations,
    FileStats
} from './types.js';

/**
 * Node.js platform (current behavior)
 */
export class NodePlatform implements PlatformOperations {
    fs: FileSystemOperations = {
        read: (filepath: string) => fs.readFileSync(filepath, 'utf8'),

        write: (filepath: string, content: string) => {
            fs.writeFileSync(filepath, content, 'utf8');
        },

        append: (filepath: string, content: string) => {
            fs.appendFileSync(filepath, content, 'utf8');
        },

        exists: (filepath: string) => fs.existsSync(filepath),

        delete: (filepath: string) => {
            fs.unlinkSync(filepath);
        },

        resolve: (filepath: string, base?: string) => {
            if (base) {
                return path.resolve(path.dirname(base), filepath);
            }
            return path.resolve(filepath);
        },

        mkdir: (dirpath: string, recursive: boolean = true) => {
            fs.mkdirSync(dirpath, { recursive });
        },

        readdir: (dirpath: string) => fs.readdirSync(dirpath),

        stat: (filepath: string): FileStats => {
            const stats = fs.statSync(filepath);
            return {
                size: stats.size,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                mtime: stats.mtime.toISOString(),
                ctime: stats.ctime.toISOString()
            };
        },

        copy: (src: string, dest: string) => {
            fs.copyFileSync(src, dest);
        },

        move: (src: string, dest: string) => {
            fs.renameSync(src, dest);
        }
    };

    sys: SystemOperations = {
        env: (name: string) => process.env[name] ?? null,
        exit: (code: number = 0): never => process.exit(code),
        args: () => process.argv.slice(2),
        cwd: () => process.cwd(),
        chdir: (dir: string) => process.chdir(dir),
        platform: () => process.platform,
        homedir: () => os.homedir(),
        tmpdir: () => os.tmpdir()
    };

    net: NetworkOperations = {
        fetch: async (url: string, options?: any) => {
            const response = await fetch(url, options);
            const text = await response.text();
            return {
                status: response.status,
                text: text,
                json: async () => JSON.parse(text)
            };
        },
        urlEncode: (str: string) => encodeURIComponent(str),
        urlDecode: (str: string) => decodeURIComponent(str)
    };

    timer: TimerOperations = {
        setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
        clearTimeout: (id: any) => clearTimeout(id),
        setInterval: (callback: () => void, ms: number) => setInterval(callback, ms),
        clearInterval: (id: any) => clearInterval(id)
    };
}

/**
 * Browser platform (no fs/sys)
 */
export class BrowserPlatform implements PlatformOperations {
    // fs and sys are undefined (not available in browser)

    net: NetworkOperations = {
        fetch: async (url: string, options?: any) => {
            const response = await fetch(url, options);
            const text = await response.text();
            return {
                status: response.status,
                text: text,
                json: async () => JSON.parse(text)
            };
        },
        urlEncode: (str: string) => encodeURIComponent(str),
        urlDecode: (str: string) => decodeURIComponent(str)
    };

    timer: TimerOperations = {
        setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
        clearTimeout: (id: any) => clearTimeout(id),
        setInterval: (callback: () => void, ms: number) => setInterval(callback, ms),
        clearInterval: (id: any) => clearInterval(id)
    };
}

/**
 * Mock platform (for testing)
 */
export class MockPlatform implements PlatformOperations {
    private files = new Map<string, string>();
    private envVars = new Map<string, string>();
    public fetchCalls: Array<{ url: string, options?: any }> = [];
    private _cwd = '/mock/cwd';

    fs: FileSystemOperations = {
        read: (filepath: string) => {
            if (!this.files.has(filepath)) {
                throw new Error(`ENOENT: no such file or directory, open '${filepath}'`);
            }
            return this.files.get(filepath)!;
        },

        write: (filepath: string, content: string) => {
            this.files.set(filepath, content);
        },

        append: (filepath: string, content: string) => {
            const existing = this.files.get(filepath) ?? '';
            this.files.set(filepath, existing + content);
        },

        exists: (filepath: string) => this.files.has(filepath),

        delete: (filepath: string) => {
            if (!this.files.has(filepath)) {
                throw new Error(`ENOENT: no such file or directory, unlink '${filepath}'`);
            }
            this.files.delete(filepath);
        },

        resolve: (filepath: string, base?: string) => {
            if (base) {
                return path.resolve(path.dirname(base), filepath);
            }
            return path.resolve(this._cwd, filepath);
        },

        mkdir: (dirpath: string, recursive: boolean = true) => {
            // Mock implementation - just record that directory exists
            this.files.set(dirpath + '/.dir', '');
        },

        readdir: (dirpath: string) => {
            const prefix = dirpath.endsWith('/') ? dirpath : dirpath + '/';
            return Array.from(this.files.keys())
                .filter(p => p.startsWith(prefix))
                .map(p => p.slice(prefix.length).split('/')[0])
                .filter((v, i, a) => a.indexOf(v) === i); // unique
        },

        stat: (filepath: string): FileStats => {
            if (!this.files.has(filepath)) {
                throw new Error(`ENOENT: no such file or directory, stat '${filepath}'`);
            }
            const content = this.files.get(filepath)!;
            return {
                size: content.length,
                isFile: !filepath.endsWith('/.dir'),
                isDirectory: filepath.endsWith('/.dir'),
                mtime: new Date().toISOString(),
                ctime: new Date().toISOString()
            };
        },

        copy: (src: string, dest: string) => {
            if (!this.files.has(src)) {
                throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
            }
            this.files.set(dest, this.files.get(src)!);
        },

        move: (src: string, dest: string) => {
            if (!this.files.has(src)) {
                throw new Error(`ENOENT: no such file or directory, rename '${src}'`);
            }
            this.files.set(dest, this.files.get(src)!);
            this.files.delete(src);
        }
    };

    sys: SystemOperations = {
        env: (name: string) => this.envVars.get(name) ?? null,
        exit: (code: number): never => {
            throw new Error(`MockExit: ${code}`);
        },
        args: () => ['mock-arg1', 'mock-arg2'],
        cwd: () => this._cwd,
        chdir: (dir: string) => {
            this._cwd = dir;
        },
        platform: () => 'mock',
        homedir: () => '/mock/home',
        tmpdir: () => '/mock/tmp'
    };

    net: NetworkOperations = {
        fetch: async (url: string, options?: any) => {
            this.fetchCalls.push({ url, options });
            return {
                status: 200,
                text: `Mock response for ${url}`,
                json: async () => ({ mock: true, url })
            };
        },
        urlEncode: (str: string) => encodeURIComponent(str),
        urlDecode: (str: string) => decodeURIComponent(str)
    };

    timer: TimerOperations = {
        setTimeout: (callback: () => void, ms: number) => {
            // Immediate execution for testing
            setImmediate(callback);
            return 123;
        },
        clearTimeout: () => {},
        setInterval: (callback: () => void, ms: number) => {
            setImmediate(callback);
            return 456;
        },
        clearInterval: () => {}
    };

    // Test helpers
    setFile(filepath: string, content: string): void {
        this.files.set(filepath, content);
    }

    getFile(filepath: string): string | undefined {
        return this.files.get(filepath);
    }

    setEnv(name: string, value: string): void {
        this.envVars.set(name, value);
    }

    clearFiles(): void {
        this.files.clear();
    }
}
```

**File: `src/Slight/Dependencies/index.ts`**

```typescript
export * from './types.js';
export * from './OutputSink.js';
export * from './Platform.js';
```

### Phase 4: Update Interpreter.ts

**Changes to `src/Slight/Interpreter.ts`:**

```typescript
// Remove direct fs imports from builtins setup
// The constructor now just calls super() with appropriate platform

import { CoreInterpreter } from './CoreInterpreter.js';
import { InterpreterDependencies } from './Dependencies/index.js';

export class Interpreter extends CoreInterpreter {
    private loadingFiles: Set<string> = new Set();
    private currentFile: string | undefined;
    private includePaths: string[] = [];

    constructor(deps?: InterpreterDependencies) {
        // Node.js interpreter uses NodePlatform by default (via CoreInterpreter)
        super(deps);
    }

    // Keep existing methods: setIncludePaths, setCurrentFile, etc.
    // Remove initBuiltins() override - platform-specific builtins now handled
    // by CoreInterpreter.addPlatformBuiltins()
}
```

### Phase 5: Update BrowserInterpreter.ts

```typescript
import { CoreInterpreter } from './CoreInterpreter.js';
import { BrowserPlatform } from './Dependencies/Platform.js';

export class BrowserInterpreter extends CoreInterpreter {
    constructor() {
        // Use BrowserPlatform (no fs/sys)
        super({
            platform: new BrowserPlatform()
        });
    }
}
```

## Testing Strategy

### Unit Tests for Dependencies

```typescript
// tests/dependencies/output-sink.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CollectingOutputSink } from '../../src/Slight/Dependencies/OutputSink.js';
import { OutputHandle } from '../../src/Slight/Types.js';

test('CollectingOutputSink captures stdout', () => {
    const sink = new CollectingOutputSink();

    sink.write({ type: OutputHandle.STDOUT, value: 'Hello' });
    sink.write({ type: OutputHandle.STDOUT, value: 'World' });

    assert.deepEqual(sink.getStdout(), ['Hello', 'World']);
});

test('CollectingOutputSink separates stdout and stderr', () => {
    const sink = new CollectingOutputSink();

    sink.write({ type: OutputHandle.STDOUT, value: 'out' });
    sink.write({ type: OutputHandle.STDERR, value: 'err' });

    assert.deepEqual(sink.getStdout(), ['out']);
    assert.deepEqual(sink.getStderr(), ['err']);
});
```

```typescript
// tests/dependencies/platform.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockPlatform } from '../../src/Slight/Dependencies/Platform.js';

test('MockPlatform file operations', () => {
    const platform = new MockPlatform();

    // Write and read
    platform.fs!.write('/test.txt', 'content');
    assert.equal(platform.fs!.read('/test.txt'), 'content');

    // Exists
    assert.equal(platform.fs!.exists('/test.txt'), true);
    assert.equal(platform.fs!.exists('/missing.txt'), false);

    // Delete
    platform.fs!.delete('/test.txt');
    assert.equal(platform.fs!.exists('/test.txt'), false);
});

test('MockPlatform tracks fetch calls', async () => {
    const platform = new MockPlatform();

    await platform.net.fetch('https://example.com', { method: 'POST' });

    assert.equal(platform.fetchCalls.length, 1);
    assert.equal(platform.fetchCalls[0].url, 'https://example.com');
    assert.equal(platform.fetchCalls[0].options.method, 'POST');
});
```

### Integration Tests with Interpreter

```typescript
// tests/interpreter-di.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CoreInterpreter } from '../src/Slight/CoreInterpreter.js';
import { CollectingOutputSink, MockPlatform } from '../src/Slight/Dependencies/index.js';

async function evaluate(interp: CoreInterpreter, code: string): Promise<any> {
    // Helper to evaluate code and return result
    // (implementation details omitted for brevity)
}

test('print output can be captured', async () => {
    const sink = new CollectingOutputSink();
    const interp = new CoreInterpreter({ outputSink: sink });

    await evaluate(interp, '(print "Hello" "World")');

    assert.deepEqual(sink.getStdout(), ['Hello World']);
});

test('fs operations use mock filesystem', async () => {
    const platform = new MockPlatform();
    platform.setFile('/data.txt', 'test content');

    const interp = new CoreInterpreter({ platform });

    const result = await evaluate(interp, '(fs/read "/data.txt")');
    assert.equal(result, 'test content');
});

test('net/fetch uses mock', async () => {
    const platform = new MockPlatform();
    const interp = new CoreInterpreter({ platform });

    await evaluate(interp, '(net/fetch "https://api.example.com/data")');

    assert.equal(platform.fetchCalls.length, 1);
    assert.equal(platform.fetchCalls[0].url, 'https://api.example.com/data');
});
```

## Migration Checklist

- [ ] Create `src/Slight/Dependencies/` directory
- [ ] Create `src/Slight/Dependencies/types.ts` with all interfaces
- [ ] Create `src/Slight/Dependencies/OutputSink.ts` with implementations
- [ ] Create `src/Slight/Dependencies/Platform.ts` with implementations
- [ ] Create `src/Slight/Dependencies/index.ts` barrel export
- [ ] Refactor `CoreInterpreter.ts`:
  - [ ] Add dependency fields
  - [ ] Update constructor to accept dependencies
  - [ ] Refactor `initBuiltins()` into `addIOBuiltins()`, `addProcessBuiltins()`, `addPlatformBuiltins()`
  - [ ] Update all builtin registrations to use dependencies
- [ ] Update `Interpreter.ts` to pass NodePlatform
- [ ] Update `BrowserInterpreter.ts` to pass BrowserPlatform
- [ ] Write unit tests for dependency implementations
- [ ] Write integration tests for interpreter with mocks
- [ ] Update existing tests to ensure backward compatibility
- [ ] Update documentation (CLAUDE.md) with DI usage examples

## Usage Examples

### Default (Backward Compatible)
```typescript
// No changes needed - uses defaults
const interpreter = new CoreInterpreter();
```

### Testing with Mocks
```typescript
const platform = new MockPlatform();
platform.setFile('/config.json', '{"setting": "value"}');
platform.setEnv('API_KEY', 'test-key');

const sink = new CollectingOutputSink();

const interpreter = new CoreInterpreter({
    outputSink: sink,
    platform: platform
});

// Run tests...
assert.equal(sink.getStdout()[0], 'Expected output');
```

### Browser Environment
```typescript
const browserInterpreter = new BrowserInterpreter();
// Automatically has no fs/sys operations
```

### Direct Console Output
```typescript
const consoleInterpreter = new CoreInterpreter({
    outputSink: new ConsoleOutputSink()
});
// Output goes directly to console instead of queue
```

## Benefits Achieved

✅ **Testability** - All I/O can be mocked
✅ **Composability** - Mix implementations easily
✅ **Platform Flexibility** - Node/Browser/Test configs
✅ **Backward Compatible** - Existing code works unchanged
✅ **Minimal Changes** - Only CoreInterpreter constructor changes
✅ **Type Safe** - TypeScript ensures correct implementations
✅ **Incremental** - Can adopt one dependency at a time

## Future Enhancements

Once this is working, we could add:

1. **TracingInterpreter** - Wraps evaluator calls to log execution
2. **ProfilingInterpreter** - Times operations and reports performance
3. **SecureInterpreter** - Restricts I/O operations for sandboxing
4. **CachingPlatform** - Caches file reads for performance
5. **RemoteProcessRuntime** - Distributes processes across network

These would all be simple to implement with the DI foundation in place.

---

**This design is complete and ready for implementation. Start with Phase 1 (creating the dependency files) and work incrementally through the phases.**
