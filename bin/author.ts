
import { Slight }        from '../src/Slight.js'
import { REPL } from '../src/Slight/REPL.js'
import { ConsoleOutput } from '../src/Slight/Outputs.js'
import { InputSource, SourceStream }   from '../src/Slight/Types.js'

class MockInput implements InputSource {
    async *run(): SourceStream {
        let x = 0;
        while (x < 100) {
            yield `(+ 1 ${++x})`;
        }
    }
}

async function main() {
    const slight1 = new Slight(
        new MockInput(),
        new ConsoleOutput('THREAD[ 1 ]')
    );

    const slight2 = new Slight(
        new MockInput(),
        new ConsoleOutput('THREAD[ 2 ]')
    );

    try {
        await Promise.all<void>([
            slight1.run(),
            slight2.run()
        ]);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

await main();
