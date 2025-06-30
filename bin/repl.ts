
import { Slight }           from '../src/Slight.js'
import { REPL, REPLOutput } from '../src/Slight/REPL.js'

async function main() {
    const slight = new Slight(
        new REPL(),
        new REPLOutput()
    );

    try {
        await slight.monitor();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
