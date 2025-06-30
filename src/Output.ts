import {
    PipelineError,
    isPipelineError,
    OutputStream,
    OutputToken
} from './Types.js';

export class Output {

    async run(source: OutputStream): Promise<void> {
        for await (const result of source) {
            console.log(result.type, this.prettyPrint(result));
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
            return `(${token.value.map(v => this.prettyPrint(v)).join(' ')})`;
        }
        return token.value.toString();
    }
}
