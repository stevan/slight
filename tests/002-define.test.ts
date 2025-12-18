
import {
    Num,
    parse,
    compile,
    run,
} from '../src/slight';


let program = compile(parse(`
    (def add (lambda (x y) (+ x y)))
    (def adder (lambda (x) (lambda (y) (add x y))))

    (add 10 20)
    ((adder 10) 20)
`));

let results = run(program);

console.group('Testing results ...');
let tests = 0;
results.filter((state) => {
    return state[0] != undefined && state[0].length > 0
}).forEach((state) => {
    let [ stack, env, kont, stepNum, tick ] = state;
    if (stack[0] == undefined) throw new Error('Expected Num(30), got undefined');
    if (!(stack[0] instanceof Num)) throw new Error(`Expected Num(30), got ${stack[0]}`);
    if ((stack[0] as Num).value != 30) {
        throw new Error(`Expected Num(30) and got Num(${(stack[0] as Num).value})`);
    } else {
        console.log('ok - got Num(30)');
    }
    tests++;
});
console.groupEnd();
console.log(`All ${tests} test(s) passed`);


