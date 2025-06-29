import { PipelineError, isPipelineError } from './Tokenizer.js';

export class Output {
    async run(source: AsyncGenerator<any | PipelineError, void, void>): Promise<void> {
        for await (const result of source) {
            console.log(this.prettyPrint(result));
        }
    }
    private prettyPrint(value: any): string {
        if (isPipelineError(value)) {
            return `[${value.stage} Error] ${value.message}`;
        }
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
            return `"${value}"`;
        }
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return '()';
            }
            return `(${value.map(v => this.prettyPrint(v)).join(' ')})`;
        }
        return value.toString();
    }
}
