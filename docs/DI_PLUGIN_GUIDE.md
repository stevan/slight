# Dependency Injection Plugin Guide

This guide shows how to extend Slight's interpreter using the Dependency Injection system.

## Overview

Slight's DI system allows you to customize interpreter behavior by injecting:
- **OutputSink** - Control where print/say/log output goes
- **PlatformOperations** - Customize fs/sys/net/timer operations
- **ProcessRuntime** - Customize process management

## Quick Start: Creating Custom Plugins

### Pattern 1: Custom OutputSink

Create a custom output sink to intercept all output:

```typescript
import { OutputSink } from './src/Slight/Dependencies/types.js';
import { OutputToken, OutputHandle } from './src/Slight/Types.js';

export class TimestampedOutputSink implements OutputSink {
    constructor(private delegate: OutputSink) {}

    write(token: OutputToken): void {
        const timestamp = new Date().toISOString();
        const timestamped = {
            ...token,
            value: `[${timestamp}] ${token.value}`
        };
        this.delegate.write(timestamped);
    }
}

// Usage
const base = new CollectingOutputSink();
const timestamped = new TimestampedOutputSink(base);
const interpreter = new CoreInterpreter({ outputSink: timestamped });
```

### Pattern 2: Custom Platform Operations

Extend an existing platform to add logging or restrictions:

```typescript
import { PlatformOperations, FileSystemOperations } from './src/Slight/Dependencies/types.js';
import { NodePlatform } from './src/Slight/Dependencies/Platform.js';

export class LoggingPlatform implements PlatformOperations {
    private platform: NodePlatform;
    public fsLogs: string[] = [];

    constructor() {
        this.platform = new NodePlatform();
    }

    get fs(): FileSystemOperations {
        const originalFs = this.platform.fs!;
        return {
            read: (path: string) => {
                this.fsLogs.push(`READ: ${path}`);
                return originalFs.read(path);
            },
            write: (path: string, content: string) => {
                this.fsLogs.push(`WRITE: ${path} (${content.length} bytes)`);
                originalFs.write(path, content);
            },
            // ... wrap other operations similarly
            exists: originalFs.exists,
            delete: originalFs.delete,
            resolve: originalFs.resolve,
            mkdir: originalFs.mkdir,
            readdir: originalFs.readdir,
            stat: originalFs.stat,
            copy: originalFs.copy,
            move: originalFs.move,
            append: originalFs.append
        };
    }

    get sys() { return this.platform.sys; }
    get net() { return this.platform.net; }
    get timer() { return this.platform.timer; }
}
```

### Pattern 3: Decorator Interpreter

Wrap an existing interpreter to add behavior:

```typescript
import { CoreInterpreter } from './src/Slight/CoreInterpreter.js';
import { ASTNode } from './src/Slight/AST.js';
import { InterpreterDependencies } from './src/Slight/Dependencies/index.js';

export class TracingInterpreter extends CoreInterpreter {
    private traceLog: Array<{ depth: number, expr: string, result: any }> = [];
    private depth = 0;

    constructor(deps?: InterpreterDependencies) {
        super(deps);
        this.wrapEvaluation();
    }

    private wrapEvaluation(): void {
        // Store original evaluate method
        const originalEvaluate = this.evaluate.bind(this);

        // Wrap it with tracing
        this.evaluate = async (node: ASTNode, env: Map<string, any>) => {
            this.depth++;
            const indent = '  '.repeat(this.depth - 1);
            const expr = this.formatNodeForTrace(node);

            console.log(`${indent}→ ${expr}`);

            try {
                const result = await originalEvaluate(node, env);
                console.log(`${indent}← ${this.formatValue(result)}`);

                this.traceLog.push({ depth: this.depth, expr, result });
                this.depth--;
                return result;
            } catch (error) {
                console.log(`${indent}✗ ${error.message}`);
                this.depth--;
                throw error;
            }
        };
    }

    private formatNodeForTrace(node: ASTNode): string {
        // Simplified - you'd expand this
        return node.constructor.name;
    }

    private formatValue(value: any): string {
        if (value === null || value === undefined) return '()';
        if (typeof value === 'string') return `"${value}"`;
        if (Array.isArray(value)) return `[${value.length} items]`;
        return String(value);
    }

    getTraceLog() {
        return this.traceLog;
    }

    clearTraceLog() {
        this.traceLog = [];
    }
}
```

## Complete Example: Tracing/Debugging Interpreter

Here's a complete implementation of a TracingInterpreter that logs all evaluation steps:

### Implementation: `src/Slight/TracingInterpreter.ts`

```typescript
import { CoreInterpreter } from './CoreInterpreter.js';
import { ASTNode } from './AST.js';
import { InterpreterDependencies } from './Dependencies/index.js';

export interface TraceEntry {
    depth: number;
    timestamp: number;
    expr: string;
    result?: any;
    error?: string;
    duration?: number;
}

export interface TracingOptions {
    enableConsole?: boolean;      // Log to console in real-time
    captureResults?: boolean;      // Store results in trace log
    maxDepth?: number;             // Maximum trace depth
    includeTimings?: boolean;      // Include timing information
}

export class TracingInterpreter extends CoreInterpreter {
    private traceLog: TraceEntry[] = [];
    private depth = 0;
    private options: Required<TracingOptions>;

    constructor(
        deps?: InterpreterDependencies,
        options: TracingOptions = {}
    ) {
        super(deps);

        this.options = {
            enableConsole: options.enableConsole ?? true,
            captureResults: options.captureResults ?? true,
            maxDepth: options.maxDepth ?? Infinity,
            includeTimings: options.includeTimings ?? true
        };

        this.instrumentEvaluation();
    }

    private instrumentEvaluation(): void {
        // We need to intercept at the AST node level
        // Since we can't easily override node.evaluate(), we'll wrap builtin calls
        this.wrapAllBuiltins();
    }

    private wrapAllBuiltins(): void {
        for (const [name, fn] of this.builtins.entries()) {
            this.builtins.set(name, this.wrapBuiltin(name, fn));
        }
    }

    private wrapBuiltin(name: string, fn: Function): Function {
        return async (...args: any[]) => {
            if (this.depth >= this.options.maxDepth) {
                return await fn(...args);
            }

            this.depth++;
            const startTime = Date.now();
            const indent = '  '.repeat(this.depth - 1);

            const formattedArgs = args.map(a => this.formatValue(a)).join(' ');
            const expr = `(${name} ${formattedArgs})`;

            if (this.options.enableConsole) {
                console.log(`${indent}→ ${expr}`);
            }

            const entry: TraceEntry = {
                depth: this.depth,
                timestamp: startTime,
                expr: expr
            };

            try {
                const result = await fn(...args);
                const duration = Date.now() - startTime;

                if (this.options.enableConsole) {
                    const timing = this.options.includeTimings ? ` [${duration}ms]` : '';
                    console.log(`${indent}← ${this.formatValue(result)}${timing}`);
                }

                if (this.options.captureResults) {
                    entry.result = result;
                }
                if (this.options.includeTimings) {
                    entry.duration = duration;
                }

                this.traceLog.push(entry);
                this.depth--;
                return result;
            } catch (error: any) {
                const duration = Date.now() - startTime;

                if (this.options.enableConsole) {
                    console.log(`${indent}✗ ${error.message}`);
                }

                entry.error = error.message;
                if (this.options.includeTimings) {
                    entry.duration = duration;
                }

                this.traceLog.push(entry);
                this.depth--;
                throw error;
            }
        };
    }

    private formatValue(value: any, maxLength = 50): string {
        if (value === null || value === undefined) return '()';
        if (typeof value === 'string') {
            const escaped = value.slice(0, maxLength);
            return escaped.length < value.length
                ? `"${escaped}..."`
                : `"${value}"`;
        }
        if (typeof value === 'number') return String(value);
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (Array.isArray(value)) {
            if (value.length === 0) return '()';
            if (value.length <= 3) {
                return `(${value.map(v => this.formatValue(v, 20)).join(' ')})`;
            }
            return `[list:${value.length}]`;
        }
        if (typeof value === 'function') return '[function]';
        if (typeof value === 'object' && 'params' in value) return '[closure]';
        return '[object]';
    }

    // Public API for trace inspection

    getTraceLog(): TraceEntry[] {
        return [...this.traceLog];
    }

    clearTraceLog(): void {
        this.traceLog = [];
    }

    getTraceStats() {
        return {
            totalCalls: this.traceLog.length,
            totalDuration: this.traceLog.reduce((sum, e) => sum + (e.duration || 0), 0),
            errors: this.traceLog.filter(e => e.error).length,
            maxDepth: Math.max(...this.traceLog.map(e => e.depth), 0),
            builtinCalls: this.countBuiltinCalls()
        };
    }

    private countBuiltinCalls(): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const entry of this.traceLog) {
            const match = entry.expr.match(/^\(([^\s)]+)/);
            if (match) {
                const name = match[1];
                counts[name] = (counts[name] || 0) + 1;
            }
        }
        return counts;
    }

    exportTraceAsJSON(): string {
        return JSON.stringify(this.traceLog, null, 2);
    }

    printTraceSummary(): void {
        const stats = this.getTraceStats();
        console.log('\n=== Trace Summary ===');
        console.log(`Total calls: ${stats.totalCalls}`);
        console.log(`Total duration: ${stats.totalDuration}ms`);
        console.log(`Errors: ${stats.errors}`);
        console.log(`Max depth: ${stats.maxDepth}`);
        console.log('\nMost called builtins:');
        const sorted = Object.entries(stats.builtinCalls)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
        for (const [name, count] of sorted) {
            console.log(`  ${name}: ${count}`);
        }
    }
}
```

### Usage Examples

#### Basic Tracing

```typescript
import { TracingInterpreter } from './src/Slight/TracingInterpreter.js';

const interpreter = new TracingInterpreter();

// Run some code
await evaluate(interpreter, `
    (def factorial (fun (n)
        (cond
            ((<= n 1) 1)
            (else (* n (factorial (- n 1)))))))

    (factorial 5)
`);

// Output will show:
// → (def factorial ...)
// ← [closure]
// → (factorial 5)
//   → (* 5 (factorial 4))
//     → (factorial 4)
//       → (* 4 (factorial 3))
//         ...

interpreter.printTraceSummary();
```

#### Silent Tracing (for analysis)

```typescript
const interpreter = new TracingInterpreter(undefined, {
    enableConsole: false,      // Don't print to console
    captureResults: true,
    includeTimings: true
});

await evaluate(interpreter, '(+ 1 2 3)');
await evaluate(interpreter, '(list/map (fun (x) (* x 2)) (list 1 2 3))');

const trace = interpreter.getTraceLog();
console.log(`Captured ${trace.length} calls`);
console.log(`Average duration: ${trace.reduce((s, e) => s + (e.duration || 0), 0) / trace.length}ms`);
```

#### Limited Depth Tracing

```typescript
const interpreter = new TracingInterpreter(undefined, {
    maxDepth: 3,  // Only trace 3 levels deep
    enableConsole: true
});

// Prevents trace spam from deeply recursive functions
```

## Testing Your Plugin

```typescript
// tests/tracing-interpreter.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TracingInterpreter } from '../src/Slight/TracingInterpreter.js';

test('TracingInterpreter captures builtin calls', async () => {
    const interp = new TracingInterpreter(undefined, {
        enableConsole: false,
        captureResults: true
    });

    await evaluate(interp, '(+ 1 2)');

    const trace = interp.getTraceLog();
    assert.equal(trace.length, 1);
    assert.ok(trace[0].expr.includes('(+ 1 2)'));
    assert.equal(trace[0].result, 3);
});

test('TracingInterpreter tracks depth correctly', async () => {
    const interp = new TracingInterpreter(undefined, { enableConsole: false });

    await evaluate(interp, `
        (def double (fun (x) (* x 2)))
        (double (double 5))
    `);

    const trace = interp.getTraceLog();
    const depths = trace.map(e => e.depth);
    assert.ok(depths.some(d => d === 1));
    assert.ok(depths.some(d => d === 2));
});
```

## Best Practices

1. **Use Delegation**: Wrap existing implementations rather than reimplementing
2. **Make it Optional**: Allow disabling features via options
3. **Performance**: Add minimal overhead when feature is disabled
4. **Composability**: Design to work with other plugins
5. **Documentation**: Clearly document what your plugin does

## Common Patterns

### Read-only Wrapper
```typescript
class ReadOnlyPlatform implements PlatformOperations {
    constructor(private platform: PlatformOperations) {}

    get fs() {
        return {
            read: this.platform.fs!.read,
            exists: this.platform.fs!.exists,
            // Throw on write operations
            write: () => { throw new Error('Read-only mode'); },
            delete: () => { throw new Error('Read-only mode'); }
        };
    }
}
```

### Caching Wrapper
```typescript
class CachingPlatform implements PlatformOperations {
    private cache = new Map<string, string>();

    constructor(private platform: PlatformOperations) {}

    get fs() {
        return {
            read: (path: string) => {
                if (this.cache.has(path)) {
                    return this.cache.get(path)!;
                }
                const content = this.platform.fs!.read(path);
                this.cache.set(path, content);
                return content;
            },
            // ... other operations pass through
        };
    }
}
```

### Rate Limiting Wrapper
```typescript
class RateLimitedPlatform implements PlatformOperations {
    private callCount = 0;
    private maxCalls = 100;

    get net() {
        return {
            fetch: async (url: string, opts?: any) => {
                if (this.callCount++ > this.maxCalls) {
                    throw new Error('Rate limit exceeded');
                }
                return await this.platform.net.fetch(url, opts);
            }
        };
    }
}
```

## Next Steps

- Explore creating custom process runtimes for distributed execution
- Build security sandboxing layers
- Create profiling interpreters that measure performance
- Implement remote debugging protocols

See the full Slight documentation for more examples and patterns.
