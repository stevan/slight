
import {
    parse,
    compile,
    run,
} from '../src/slight';


let program = compile(
    parse(`
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
    `)
);

console.log(program.map((e) => e.toNativeStr()).join("\n"));

let results = run(program);
console.log("RESULT(s)", results.map((state) => {
    let [ stack, env, kont ] = state;
    return [
        `STACK : ${stack.map((t) => t.toNativeStr()).join(', ')};`,
        `ENV : ${env.toNativeStr()};`,
        `KONT :  ${kont.map((k) => k.toString()).join(', ')};`,
    ].join(' ')
}));
