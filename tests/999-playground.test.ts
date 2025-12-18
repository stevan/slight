
import {
    Dumper,
    parse,
    compile,
    run,
} from '../src/slight';


let program = compile(parse(`
    (lambda (x) (+ x x))
`));

let results = run(program);

Dumper.log(results);




