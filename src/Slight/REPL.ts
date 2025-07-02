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
