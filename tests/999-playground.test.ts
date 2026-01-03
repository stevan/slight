
import { test } from "node:test"
import  assert  from "node:assert"

import { Dumper } from '../src/Slight/Util'
import { parse, compile, Slight } from '../src/Slight';


test("... playground", async (t) => {

    let program = compile(parse(`

        (def Foo %(:foo 10 :bar %(:baz 10 :gorch 20) :bling 30))

        (store Foo :other (+ (fetch Foo :foo) (fetch Foo :foo)))

        (+ (fetch Foo :foo) (fetch Foo :other))

        (delete Foo :bar)

        (pprint Foo)


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
