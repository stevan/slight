
import { test } from "node:test"
import  assert  from "node:assert"

import { Dumper } from '../src/Slight/Util'
import { parse, compile, Machine } from '../src/Slight';


test("... playground", async (t) => {

    let program = compile(parse(`

        (defun (is-thirty x)
            (if (== x 30)
                (print "Got 30")
                (print "Not 30")))

        (is-thirty (ai-repl "give me an expression that always evaluates to 30, use lambda expressions and named functions. be creative, try 3 different options and choose one, make sure it works correctly before resuming"))

    `));

    Dumper.log("PROGRAM:\n", program.map((expr) => expr.toNativeStr()).join("\n"));

    let machine = new Machine();

    let k = await machine.run(program);

    Dumper.log("RESULTS", k.stack!);
});
