import { OutputToken, OutputHandle } from '../Types.js';
import { OutputSink } from './types.js';

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
            .filter(t => t.type === OutputHandle.WARN || t.type === OutputHandle.ERROR)
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
        } else if (token.type === OutputHandle.WARN) {
            process.stderr.write(token.value);
        } else if (token.type === OutputHandle.ERROR) {
            console.error(token.value);
        }
    }
}
