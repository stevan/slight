
import { test } from "node:test"
import  assert  from "node:assert"

import { Dumper } from '../src/Slight/Util'
import { parse, compile, Slight } from '../src/Slight';


test("... playground", async (t) => {

    let program = compile(parse(`

        (print (+ 100 (repl)))

    `));

    Dumper.log("PROGRAM:\n", program.map((expr) => expr.toNativeStr()).join("\n"));

    let slight = new Slight();

    let k = await slight.run(program);

    Dumper.log("RESULTS", {
        action : k.action,
        args   : k.args,
        stack  : k.stack,
        env    : k.env.bindings,
    });
});
