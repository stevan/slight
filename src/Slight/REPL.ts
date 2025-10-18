import * as readline from 'readline';

import {
    InputSource,
    SourceStream,
    OutputSink,
    OutputStream,
    isPipelineError,
    OutputToken,
} from './Types.js'

export class REPL implements InputSource {
    private $readline : readline.ReadLine;
    private $running  : boolean;

    constructor() {
        this.$running  = false;
        this.$readline = readline.createInterface({
            input  : process.stdin,
            output : process.stdout
        });
    }

    async *run(): SourceStream {
        this.$running = true;
        let buffer = '';
        let parenCount = 0;
        let prompt = '? ';
        process.stdout.write([
"   _____ ___       __    __",
"  / ___// (_)___ _/ /_  / /_",
"  \\__ \\/ / / __ `/ __ \\\/ __/",
" ___/ / / / /_/ / / / / /_",
"/____/_/_/\\__, /_/ /_/\\__/",
"         /____/ v0.0.1",
"",
"Type :q to quit",
"",
        ].join('\n') + '\n');
        while (this.$running) {
            const line = await new Promise<string>((resolve) => {
                this.$readline.question(prompt, (answer: string) => {
                    if (answer === ':q') {
                        this.$running = false;
                        answer = '';
                    }
                    resolve(answer);
                });
            });
            if (!this.$running) break;
            buffer += (buffer ? '\n' : '') + line;
            parenCount += (line.match(/\(/g) || []).length;
            parenCount -= (line.match(/\)/g) || []).length;
            prompt = parenCount > 0 ? '... ' : '? ';
            if (parenCount === 0 && buffer.trim() !== '') {
                yield buffer;
                buffer = '';
            }
        }
        this.$readline.close();
    }
}

export class REPLOutput implements OutputSink {

    async run(source: OutputStream): Promise<void> {
        for await (const result of source) {
            console.log(result.type, this.prettyPrint(result));
        }
    }

    private prettyPrint(token: OutputToken | any): string {
        // If it's an OutputToken, extract the value
        const value = token?.value !== undefined ? token.value : token;

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
