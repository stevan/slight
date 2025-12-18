
import {
    Dumper,
    Num,
    parse,
    compile,
    run,
} from '../src/slight';


let program = compile(parse(`
    (def add (lambda (x y) (+ x y)))
    (def adder (lambda (x) (lambda (y) (add x y))))

    ((adder 10) (add 15 5))
`));

let results = run(program);

console.group('Testing results ...');
let [ stack, env, kont, tick ] = results;
if (stack[0] == undefined) throw new Error('Expected Num(30), got undefined');
if (!(stack[0] instanceof Num)) throw new Error(`Expected Num(30), got ${stack[0]}`);
if ((stack[0] as Num).value != 30) {
    throw new Error(`Expected Num(30) and got Num(${(stack[0] as Num).value})`);
} else {
    console.log('ok - got Num(30)');
}
console.groupEnd();
console.log(`All test(s) passed`);


