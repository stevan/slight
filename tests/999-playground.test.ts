
import { test } from "node:test"
import  assert  from "node:assert"

import { Dumper } from '../src/Slight/Logger'
import { parse, compile, run } from '../src/Slight';


test("... playground", async (t) => {

    let program = compile(parse(`
        (readline x)
        (print x)
    `));

    let results = await run(program);

    Dumper.log("RESULTS", results);
});



