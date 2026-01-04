
import { test } from "node:test"
import  assert  from "node:assert"

import { Dumper } from '../src/Slight/Util'
import { parse, compile, Slight } from '../src/Slight';


test("... playground", async (t) => {

    let program = compile(parse(`

            (+ 10
                (try
                    (throw "need twenty!")
                    (catch (e)
                        (try
                            (do
                                (print e)
                                (throw 20))
                            (catch (e)
                                (exception-msg e))
                        ))))

    `));

    //

    Dumper.log("PROGRAM:\n", program.map((expr) => expr.toNativeStr()).join("\n"));
    //Dumper.log("PROGRAM:\n", program);

    let slight = new Slight();

    let k = await slight.run(program);

    Dumper.log("RESULTS", {
        action : k.action,
        args   : k.args,
        stack  : k.stack,
        env    : k.env.bindings,
    });
});
