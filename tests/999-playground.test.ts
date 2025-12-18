
import {
    Dumper,
    parse,
    compile,
    run,
} from '../src/slight';


let program = compile(parse(`
    (define add (lambda (x y) (+ x y)))
    (define adder (lambda (x) (lambda (y) (add x y))))

    ((adder 10) 20)
`));

let results = run(program);

Dumper.log(results);




