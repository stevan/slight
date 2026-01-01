
import { test } from "node:test"
import  assert  from "node:assert"

import { Dumper } from '../src/Slight/Util'
import { parse, compile, Machine } from '../src/Slight';


test("... playground", async (t) => {

    let program = compile(parse(`

        (~ "Hello " (repl))

    `));

    Dumper.log("PROGRAM", program);

    let machine = new Machine();

    let k = await machine.run(program);

    Dumper.log("RESULTS", k.stack!);
});
