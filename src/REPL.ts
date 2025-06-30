import * as readline from 'readline';

import { SourceStream } from './Types.js'

export class REPL {
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
