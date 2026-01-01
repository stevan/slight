
import { test } from "node:test"
import  assert  from "node:assert"

import { Dumper } from '../src/Slight/Util'
import { parse, compile, Machine } from '../src/Slight';


test("... playground", async (t) => {

    let program = compile(parse(`

        (if (== 30 (ai-repl "generate a complex expression that evaluates to 30, try up to 3 options before deciding"))
            (print "Got 30")
            (print "Not 30"))

    `));

    Dumper.log("PROGRAM:\n", program.map((expr) => expr.toNativeStr()).join("\n"));

    let machine = new Machine();

    let k = await machine.run(program);

    Dumper.log("RESULTS", k.stack!);
});
