
import { Dumper } from '../src/Slight/Logger'
import { parse, compile, run } from '../src/Slight';


let program = compile(parse(`
    (list
        (+ 10 20)
        (* 10 20))
`));

let results = run(program);

Dumper.log(results);




