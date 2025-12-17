
import {
    Num,
    parse,
    compile,
    run,
} from '../src/slight';


let program = compile(parse(`
    30
    (+ 10 20)
    (+ 10 (+ 10 10))
    (+ (* 2 5) 20)
    (+ (+ 5 5) (* 2 10))
    (+ (- 20 10) (* 4 (+ 3 2)))
    ((lambda (x y) (+ x y)) 10 20)
    ((lambda (x y) (+ x y)) (+ 5 5) 20)
    ((lambda (x y) (+ x y)) 10 (* 2 10))
    ((lambda (x y) (+ x y)) (+ 5 5) (* 2 10))
    (((lambda (x) (lambda (y) (+ x y))) 10) 20)
`));

let results = run(program);

console.group('Testing results ...');
let tests = 0;
results.forEach((state) => {
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
