
import { test } from "node:test"
import  assert  from "node:assert"

import { Dumper } from '../src/Slight/Logger'
import { parse, compile, Machine } from '../src/Slight';


test("... playground", async (t) => {

    let program = compile(parse(`

        (readline x)
        (print x)

    `));

    let machine = new Machine();
    machine.load(program);

    let results = await machine.run();

    Dumper.log("RESULTS", results[0].stack!);
});
