export class Debugger {
    static wrap<T, R>(stage: { run: (src: AsyncGenerator<T, void, void>) => AsyncGenerator<R, void, void> }, label: string) {
        return {
            async *run(src: AsyncGenerator<T, void, void>): AsyncGenerator<R, void, void> {
                for await (const input of src) {
                    Debugger.log(`[${label}] IN:`, input);
                    const gen = stage.run((async function* () { yield input; })());
                    for await (const output of gen) {
                        Debugger.log(`[${label}] OUT:`, output);
                        yield output;
                    }
                }
            }
        };
    }
    private static log(...args: any[]) {
        console.log(...args);
    }
}
