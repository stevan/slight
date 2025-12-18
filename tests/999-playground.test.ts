
import {
    Dumper,
    parse,
    compile,
    run,
} from '../src/slight';


let program = compile(parse(`
    (list
        (+ 10 20)
        (* 10 20))
`));

let results = run(program);

Dumper.log(results);




