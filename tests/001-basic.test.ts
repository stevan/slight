
import { test } from "node:test"
import  assert  from "node:assert"

import { Num, Cons } from '../src/Slight/Terms'
import { Dumper } from '../src/Slight/Util'
import { parse, compile, Slight } from '../src/Slight'


test("... playground", async (t) => {
    let program = compile(parse(`
        (defun (add x y) (+ x y))

        (defun (adder x)
            (lambda (y) (add x y)))

        (defun (length list)
            (if (nil? list)
                0
                (+ 1 (length (tail list)))))

        (defun (factorial n)
            (if (== n 0)
                1
                (* n (factorial (- n 1)))))

        (defun (even? n)
            (if (== n 0)
                true
                (odd? (- n 1))))

        (defun (odd? n)
            (if (== n 0)
                false
                (even? (- n 1))))

        (list
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
            (head (tail (tail (list 10 20 30))))
            (+ (head (list 10 20)) (head (tail (list 10 20))))
            (?: true  30 0)
            (?: false 0 30)
            (?: (== 10 10) (+ 10 20) 0)
            (?: (== 10 20) 0 (+ 10 20))
            (?: false 0 (?: false 0 (+ 10 20)))
            (&& true  30)
            (|| (odd? 10) 30)
            (|| false (and (even? 10) (+ 10 20)))
            (or (< 10 0) (&& (>= (+ 20 30) 10) (+ 10 20)))
            (and (not (! (even? 16))) (or (! true) 30))
            (add 10 20)
            ((adder 10) (add 15 5))
            (+ 20 (length (list 0 1 2 3 4 5 6 7 8 9)))
            (- 750 (factorial 6))
            (eval (quote (+ 10 20)))
            (eval '(+ 10 20))
            (eval (cons (quote +) (quote (10 20))))
            (eval (cons '+ '(10 20)))
        )
    `));

    let machine = new Slight();

    let results = await machine.run(program);

    console.group('Testing results ...');
    let k = results;

    let list = k.stack.pop() as Cons;

    let tests = 0;
    list.toNativeArray().forEach((val) => {
        if (val == undefined) throw new Error('Expected Num(30), got undefined');
        if (!(val instanceof Num)) throw new Error(`Expected Num(30), got ${val}`);
        if ((val as Num).value != 30) {
            throw new Error(`Expected Num(30) and got Num(${(val as Num).value})`);
        } else {
            console.log('ok - got Num(30)');
        }
        tests++;
    });
    console.groupEnd();
    console.log(`All ${tests} test(s) passed`);
});

