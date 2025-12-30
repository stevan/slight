
import { test } from "node:test"
import  assert  from "node:assert"

import { Dumper } from '../src/Slight/Logger'
import { parse, compile, run } from '../src/Slight';


test("... playground", async (t) => {

    let program = compile(parse(`

        (eval (cons (quote +) (quote (10 20))))

    `));

    let results = await run(program);

    Dumper.log("RESULTS", results);
});



/*

    (def (even? n)
        (if (== n 0)
            true
            (odd? (- n 1))))

    (def (odd? n)
        (if (== n 0)
            false
            (even? (- n 1))))

*/
