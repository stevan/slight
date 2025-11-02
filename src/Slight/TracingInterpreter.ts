import { CoreInterpreter } from './CoreInterpreter.js';
import { InterpreterDependencies } from './Dependencies/index.js';

/**
 * Represents a single trace entry in the execution log.
 */
export interface TraceEntry {
    depth: number;          // Call stack depth
    timestamp: number;      // When the call started (ms since epoch)
    expr: string;           // The expression being evaluated (formatted)
    result?: any;           // The result (if captureResults is enabled)
    error?: string;         // Error message (if the call threw)
    duration?: number;      // How long the call took (ms)
}

/**
 * Configuration options for the TracingInterpreter.
 */
export interface TracingOptions {
    enableConsole?: boolean;      // Log to console in real-time (default: true)
    captureResults?: boolean;      // Store results in trace log (default: true)
    maxDepth?: number;             // Maximum trace depth (default: Infinity)
    includeTimings?: boolean;      // Include timing information (default: true)
}

/**
 * TracingInterpreter extends CoreInterpreter to add execution tracing.
 *
 * It wraps all builtin function calls to log:
 * - Call depth with visual indentation
 * - Arguments and return values (formatted)
 * - Timing information
 * - Error tracking
 *
 * Example usage:
 * ```typescript
 * const interp = new TracingInterpreter();
 * await evaluate(interp, '(+ 1 2)');
 * // Output: → (+ 1 2)
 * //         ← 3 [0ms]
 *
 * interp.printTraceSummary();
 * // Shows statistics about the execution
 * ```
 */
export class TracingInterpreter extends CoreInterpreter {
    private traceLog: TraceEntry[] = [];
    private depth = 0;
    private options: Required<TracingOptions>;

    constructor(
        deps?: InterpreterDependencies,
        options: TracingOptions = {}
    ) {
        super(deps);

        // Set default options
        this.options = {
            enableConsole: options.enableConsole ?? true,
            captureResults: options.captureResults ?? true,
            maxDepth: options.maxDepth ?? Infinity,
            includeTimings: options.includeTimings ?? true
        };

        // Wrap all builtins after construction
        this.wrapAllBuiltins();
    }

    /**
     * Wraps all builtin functions to add tracing.
     */
    private wrapAllBuiltins(): void {
        for (const [name, fn] of this.builtins.entries()) {
            this.builtins.set(name, this.wrapBuiltin(name, fn));
        }
    }

    /**
     * Wraps a single builtin function to add tracing.
     */
    private wrapBuiltin(name: string, fn: Function): Function {
        return async (...args: any[]) => {
            // If we've exceeded max depth, just call the function without tracing
            if (this.depth >= this.options.maxDepth) {
                return await fn(...args);
            }

            this.depth++;
            const startTime = Date.now();
            const indent = '  '.repeat(this.depth - 1);

            // Format the expression for display
            const formattedArgs = args.map(a => this.formatValue(a)).join(' ');
            const expr = `(${name} ${formattedArgs})`;

            // Log entry to console if enabled
            if (this.options.enableConsole) {
                console.log(`${indent}→ ${expr}`);
            }

            // Create trace entry
            const entry: TraceEntry = {
                depth: this.depth,
                timestamp: startTime,
                expr: expr
            };

            try {
                // Execute the actual function
                const result = await fn(...args);
                const duration = Date.now() - startTime;

                // Log exit to console if enabled
                if (this.options.enableConsole) {
                    const timing = this.options.includeTimings ? ` [${duration}ms]` : '';
                    console.log(`${indent}← ${this.formatValue(result)}${timing}`);
                }

                // Capture result and timing if enabled
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

                // Log error to console if enabled
                if (this.options.enableConsole) {
                    console.log(`${indent}✗ ${error.message}`);
                }

                // Capture error and timing
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

    /**
     * Formats a value for display in traces.
     * Handles strings, numbers, booleans, arrays, functions, and objects.
     */
    private formatValue(value: any, maxLength = 50): string {
        // Null/undefined
        if (value === null || value === undefined) return '()';

        // Strings
        if (typeof value === 'string') {
            const escaped = value.slice(0, maxLength);
            return escaped.length < value.length
                ? `"${escaped}..."`
                : `"${value}"`;
        }

        // Numbers
        if (typeof value === 'number') return String(value);

        // Booleans
        if (typeof value === 'boolean') return value ? 'true' : 'false';

        // Arrays (lists)
        if (Array.isArray(value)) {
            if (value.length === 0) return '()';
            if (value.length <= 3) {
                return `(${value.map(v => this.formatValue(v, 20)).join(' ')})`;
            }
            return `[list:${value.length}]`;
        }

        // Functions
        if (typeof value === 'function') return '[function]';

        // Closures (objects with params and body)
        if (typeof value === 'object' && 'params' in value) return '[closure]';

        // Other objects
        return '[object]';
    }

    // ========== Public API ==========

    /**
     * Returns a copy of the trace log.
     */
    getTraceLog(): TraceEntry[] {
        return [...this.traceLog];
    }

    /**
     * Clears the trace log.
     */
    clearTraceLog(): void {
        this.traceLog = [];
    }

    /**
     * Returns statistics about the trace execution.
     */
    getTraceStats() {
        return {
            totalCalls: this.traceLog.length,
            totalDuration: this.traceLog.reduce((sum, e) => sum + (e.duration || 0), 0),
            errors: this.traceLog.filter(e => e.error).length,
            maxDepth: Math.max(...this.traceLog.map(e => e.depth), 0),
            builtinCalls: this.countBuiltinCalls()
        };
    }

    /**
     * Counts how many times each builtin was called.
     */
    private countBuiltinCalls(): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const entry of this.traceLog) {
            // Extract function name from expression like "(+ 1 2)"
            const match = entry.expr.match(/^\(([^\s)]+)/);
            if (match) {
                const name = match[1];
                counts[name] = (counts[name] || 0) + 1;
            }
        }
        return counts;
    }

    /**
     * Exports the trace log as JSON.
     */
    exportTraceAsJSON(): string {
        return JSON.stringify(this.traceLog, null, 2);
    }

    /**
     * Prints a human-readable summary of the trace.
     */
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
