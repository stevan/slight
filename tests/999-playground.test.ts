
import { test } from "node:test"
import  assert  from "node:assert"

import { Dumper } from '../src/Slight/Util'
import { parse, compile, Machine } from '../src/Slight';


test("... playground", async (t) => {

    let program = compile(parse(`

        (repl)


    `));

    Dumper.log("PROGRAM:\n", program.map((expr) => expr.toNativeStr()).join("\n"));

    let machine = new Machine();

    let k = await machine.run(program);

    Dumper.log("RESULTS", {
        action : k.action,
        args   : k.args,
        stack  : k.stack,
        env    : k.env.bindings,
    });
});
