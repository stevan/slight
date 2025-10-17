import {
    isPipelineError,
    OutputStream,
    OutputSink,
    OutputToken,
    OutputHandle
} from './Types.js';

export class ConsoleOutput implements OutputSink {

    constructor(public prefix : string = '') {}

    async run(source: OutputStream): Promise<void> {
        for await (const result of source) {
            console.log(this.prefix, result.type, this.prettyPrint(result));
        }
    }

    private prettyPrint(token: OutputToken): string {
        if (isPipelineError(token.value)) {
            return `[${token.value.stage} Error] ${token.value.message}`;
        }
        if (token.value === null || token.value === undefined) {
            return '()';
        }
        if (typeof token.value === 'boolean') {
            return token.value ? 'true' : 'false';
        }
        if (typeof token.value === 'number') {
            return token.value.toString();
        }
        if (typeof token.value === 'string') {
            return `"${token.value}"`;
        }
        if (Array.isArray(token.value)) {
            if (token.value.length === 0) {
                return '()';
            }
            return `(${token.value.map(v => this.prettyPrint({ type: token.type, value: v })).join(' ')})`;
        }
        return token.value.toString();
    }
}

/**
 * StandardOutput - Filters STDOUT tokens and writes to process.stdout (Node) or console.log (Browser)
 */
export class StandardOutput implements OutputSink {
    private isNode: boolean;

    constructor() {
        this.isNode = typeof process !== 'undefined' && process.stdout != null;
    }

    async run(source: OutputStream): Promise<void> {
        for await (const result of source) {
            // Only handle STDOUT tokens
            if (result.type !== OutputHandle.STDOUT) {
                continue;
            }

            const output = this.formatValue(result.value);

            if (this.isNode) {
                process.stdout.write(output);
            } else {
                console.log(output);
            }
        }
    }

    private formatValue(value: any): string {
        if (value === null || value === undefined) {
            return '';
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
            return `(${value.map(v => this.formatValue(v)).join(' ')})`;
        }
        return String(value);
    }
}

/**
 * StandardError - Filters non-STDOUT tokens and writes to process.stderr (Node) or console (Browser)
 */
export class StandardError implements OutputSink {
    private isNode: boolean;

    constructor() {
        this.isNode = typeof process !== 'undefined' && process.stderr != null;
    }

    async run(source: OutputStream): Promise<void> {
        for await (const result of source) {
            // Only handle non-STDOUT tokens
            if (result.type === OutputHandle.STDOUT) {
                continue;
            }

            const output = this.formatToken(result);

            if (this.isNode) {
                process.stderr.write(output + '\n');
            } else {
                // Use appropriate console method based on type
                switch (result.type) {
                    case OutputHandle.ERROR:
                        console.error(output);
                        break;
                    case OutputHandle.WARN:
                        console.warn(output);
                        break;
                    case OutputHandle.INFO:
                    case OutputHandle.DEBUG:
                    default:
                        console.log(output);
                        break;
                }
            }
        }
    }

    private formatToken(token: OutputToken): string {
        const prefix = `${token.type} `;

        if (isPipelineError(token.value)) {
            return `${prefix}[${token.value.stage} Error] ${token.value.message}`;
        }

        return prefix + this.formatValue(token.value);
    }

    private formatValue(value: any): string {
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
            return `(${value.map(v => this.formatValue(v)).join(' ')})`;
        }
        return String(value);
    }
}

/**
 * CombinedOutput - Routes STDOUT to StandardOutput and everything else to StandardError
 * Convenient wrapper for using both outputs together
 */
export class CombinedOutput implements OutputSink {
    private stdout: StandardOutput;
    private stderr: StandardError;

    constructor() {
        this.stdout = new StandardOutput();
        this.stderr = new StandardError();
    }

    async run(source: OutputStream): Promise<void> {
        // We need to duplicate the stream to both sinks
        const tokens: OutputToken[] = [];

        // Collect all tokens
        for await (const token of source) {
            tokens.push(token);
        }

        // Process through both sinks
        async function* replayTokens(tokens: OutputToken[]) {
            for (const token of tokens) {
                yield token;
            }
        }

        await Promise.all([
            this.stdout.run(replayTokens(tokens)),
            this.stderr.run(replayTokens(tokens))
        ]);
    }
}
