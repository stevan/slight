
import {
    DEBUG,
    HEADER, FOOTER, LOG,
    GREEN, RED, ORANGE, YELLOW, BLUE, PURPLE, GREY,
} from './Slight/Logger'

import { ROOT_ENV } from './Slight/Runtime'

import * as C from './Slight/Terms'
import * as E from './Slight/Environment'
import * as K from './Slight/Kontinue'

export * as Util   from './Slight/Util'
export { parse   } from './Slight/Parser';
export { compile } from './Slight/Compiler';

// -----------------------------------------------------------------------------
// I/O
// -----------------------------------------------------------------------------

import { createInterface } from 'node:readline/promises';

const READLINE = createInterface({
    input  : process.stdin,
    output : process.stdout,
});

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------

export type State = [ K.Kontinue, K.Kontinue[], number ];

export async function run (program : C.Term[]) : Promise<State> {

    // provides the starting continuation
    // for evaluating any expression
    const evaluateTerm = (expr : C.Term, env : E.Environment) : K.Kontinue => {
        HEADER(BLUE, `EVAL`, '.');
        LOG(BLUE, `[ ${expr.toNativeStr()} ] + ENV ${env.toNativeStr()}`);
        switch (expr.constructor) {
        case C.Nil    :
        case C.Num    :
        case C.Str    :
        case C.Bool   :
        case C.Native :
        case C.FExpr  :
        case C.Lambda : return K.Return( expr, env );
        case C.Sym    : return K.Return( env.lookup( expr as C.Sym ), env );
        case C.Pair   : return K.EvalPair( expr as C.Pair, env );
        case C.Cons   : return K.EvalCons( expr as C.Cons, env );
        default:
            throw new Error(`Unrecognized Expression ${expr.constructor.name}`);
        }
    }

    // returns a value to the previous
    // continuation in the stack
    const returnValues = (kont : K.Kontinue[], ...values : C.Term[]) : void => {
        if (kont.length == 0)
            throw new Error(`Cannot return value ${values.map((v) => v.toNativeStr()).join(', ')} without continuation`);
        let top = kont.at(-1) as K.Kontinue;
        top.stack.push( ...values );
    }

    // the step function ... !!!
    const execute = (startEnv : E.Environment, kont : K.Kontinue[]) : State => {
        HEADER(GREEN, `START`, '=');
        LOG(GREEN, `EVAL in ${startEnv.toNativeStr()}`);
        if (kont.length == 0) {
            LOG(GREY, `KONT : ~`);
        }
        else {
            LOG(GREY, `KONT :\n `, kont.toReversed().map((k) => K.pprint(k)).join("\n  "));
        }

        let tick = 0;

        HEADER(YELLOW, `Begin Statement`, '_');
        while (kont.length > 0) {
            tick++;
            let k = kont.pop() as K.Kontinue;
            HEADER(PURPLE, `STEP(${tick})`, '-');
            LOG(RED, `=> K : `, K.pprint(k));
            switch (k.op) {
            // ---------------------------------------------------------------------
            // This is the end of HOST operation, an async exit point
            // ---------------------------------------------------------------------
            case 'HOST':
                HEADER(ORANGE, `HOST`, '^');
                return [ k, kont, tick ];
            // ---------------------------------------------------------------------
            // This is the end of a statement, main exit point
            // ---------------------------------------------------------------------
            case 'HALT':
                HEADER(YELLOW, `Halt`, '_');
                return [ k, kont, tick ];
            // ---------------------------------------------------------------------
            // This is for defining things in the environment
            // ---------------------------------------------------------------------
            case 'DEFINE':
                let body = k.stack.pop() as C.Term;
                k.env.define( k.name, body );
                break;
            // ---------------------------------------------------------------------
            // This is a literal value to be returned to the
            // previous continuation in the stack
            // ---------------------------------------------------------------------
            case 'RETURN':
                returnValues( kont, k.value );
                break;
            // =====================================================================
            // Conditonal
            // =====================================================================
            case 'IF/ELSE':
                let cond = k.stack.pop();
                if (cond == undefined) throw new Error(`STACK UNDERFLOW, expected bool condition`);
                if (!(cond instanceof C.Bool)) throw new Error(`Expected Bool at top of stack, not ${cond.toString()}`);
                if ((cond as C.Bool).value) {
                    kont.push(
                        (k.cond === k.ifTrue)
                            ? K.Return( cond, k.env )
                            : evaluateTerm( k.ifTrue, k.env )
                    );
                } else {
                    kont.push(
                        (k.cond === k.ifFalse)
                            ? K.Return( cond, k.env )
                            : evaluateTerm( k.ifFalse, k.env )
                    );
                }
                break;
            // =====================================================================
            // Eval
            // =====================================================================
            // Main entry point
            // ---------------------------------------------------------------------
            case 'EVAL/EXPR':
                kont.push( evaluateTerm( k.expr, k.env ) );
                break;
            // ---------------------------------------------------------------------
            // Eval the Top of Stack
            // ---------------------------------------------------------------------
            case 'EVAL/TOS':
                let toEval = k.stack.pop();
                if (toEval === undefined) throw new Error('EVAL/TOS: empty stack');
                kont.push(evaluateTerm(toEval, k.env));
                break;
            // ---------------------------------------------------------------------
            // Eval Pairs
            // ---------------------------------------------------------------------
            case 'EVAL/PAIR':
                let pair  = k.pair;
                kont.push(
                    K.EvalPairSecond( pair.second, k.env ),
                    evaluateTerm( pair.first, k.env ),
                );
                break;
            case 'EVAL/PAIR/SND':
                let second = evaluateTerm( k.second, k.env );
                let efirst = k.stack.pop() as C.Term;
                let mkPair = K.MakePair( k.env );
                mkPair.stack.push(efirst);
                kont.push( mkPair, second );
                break;
            case 'MAKE/PAIR':
                let snd = k.stack.pop();
                let fst = k.stack.pop();
                if (fst == undefined) throw new Error('Expected fst on stack');
                if (snd == undefined) throw new Error('Expected snd on stack');
                kont.push( K.Return( new C.Pair( fst as C.Term, snd as C.Term ), k.env ) );
                break;
            // ---------------------------------------------------------------------
            // Eval Lists
            // ---------------------------------------------------------------------
            case 'EVAL/CONS':
                let cons  = k.cons;
                let check = K.ApplyExpr( cons.tail, k.env );
                kont.push( check, evaluateTerm( cons.head, k.env ) );
                break;
            case 'EVAL/CONS/TAIL':
                let tail = k.tail;
                if (tail instanceof C.Nil) throw new Error(`Tail is Nil!`);

                if (!((tail as C.Cons).tail instanceof C.Nil)) {
                    kont.push( K.EvalConsTail( (tail as C.Cons).tail, k.env ) );
                }

                k.stack.splice(0).forEach((evaled) => returnValues( kont, evaled ));
                kont.push( evaluateTerm( (tail as C.Cons).head, k.env ) );
                break;
            // ---------------------------------------------------------------------
            // Handle function calls
            // ---------------------------------------------------------------------
            case 'APPLY/EXPR':
                let call = k.stack.pop();
                if (call == undefined) throw new Error('Expected call on stack');
                if (call instanceof C.Operative) {
                    kont.push( K.ApplyOperative( (call as C.FExpr), k.args, k.env ));
                }
                else if (call instanceof C.Applicative) {
                    kont.push(
                        K.ApplyApplicative( (call as C.Applicative), k.env ),
                        K.EvalConsTail( k.args, k.env )
                    );
                }
                else {
                    throw new Error(`What to do with call -> ${call.toString()}??`);
                }
                break;
            // =====================================================================
            // APPLY
            // =====================================================================
            // Operatives, or FExprs
            // - the arguments are not evaluated
            // ---------------------------------------------------------------------
            case 'APPLY/OPERATIVE':
                kont.push(...(k.call as C.FExpr).body( (k.args as C.Cons).toNativeArray(), k.env ));
                break;
            // ---------------------------------------------------------------------
            // Applicatives, or Lambdas & Native Functions
            // - arguments are evaluated
            // ---------------------------------------------------------------------
            case 'APPLY/APPLICATIVE':
                switch (k.call.constructor) {
                case C.Native:
                    kont.push( K.Return( (k.call as C.Native).body( k.stack, k.env ), k.env ));
                    break;
                case C.Lambda:
                    let lambda  = k.call as C.Lambda;
                    let local   = lambda.env;

                    let params  = lambda.params.toNativeArray();
                    let args    = k.stack;
                    kont.push( K.EvalExpr( lambda.body, local.derive( params as C.Sym[], args ) ) );
                }
                break;
            // ---------------------------------------------------------------------
            // .. the end
            // ---------------------------------------------------------------------
            default:
                throw new Error(`Unknown Continuation op ${JSON.stringify(k)}`);
            }

            if (kont.length == 0) {
                LOG(GREY, `KONT : ~`);
            }
            else {
                LOG(GREY, `KONT :\n `, kont.toReversed().map((k) => K.pprint(k)).join("\n  "));
            }
        }

        // should never happen
        throw new Error(`WTF, this should never happen, we should always return`);
    }

    // ... program
    HEADER(ORANGE, 'PROGRAM', ':');
    LOG(ORANGE, program.map((e) => e.toNativeStr()).join("\n"));
    FOOTER(ORANGE, ':');

    // start with a fresh one!
    let env = ROOT_ENV.capture();
    // compile all the expressions
    // and add a Halt at the end
    let kont = [
        ...program.map((expr) => K.EvalExpr(expr, env)),
        K.Halt(env)
    ].reverse();

    let results;
    while (true) {
        //console.log(`Got ${kont.length} to run`);
        // run the program and collect the results
        results = execute(env, kont);
        if (results == undefined)
            throw new Error('Expected result from step, got undefined');

        let [ k, rest, tick ] = results;
        if (k.op == 'HOST') {
            HEADER(GREEN, `PAUSE (${k.handler})`, '@');
            switch (k.handler) {
            case 'IO::print':
                console.log("STDOUT: ", k.stack.map((t) => t.toNativeStr()));
                break;
            case 'IO::readline':
                let input = await READLINE.question('? ');
                returnValues(rest, new C.Str(input));
                break;
            default:
                throw new Error(`The handler ${k.handler} is not supported`);
            }
            HEADER(GREEN, `RESUME (${k.handler})`, '@');
        }

        // if we are done then print the results and exit
        if (rest.length == 0) {
            HEADER(ORANGE, `RESULT(s)`, '=');
            LOG(ORANGE, [
                `STEPS[${tick.toString().padStart(3, '0')}] =>`,
                `STACK : ${k.stack.map((t) => t.toNativeStr()).join(', ')};`,
                `ENV : ${k.env.toNativeStr()};`,
                `KONT : [${kont.map((k) => K.pprint(k)).join(', ')}]`,
            ].join(' '));
            FOOTER(ORANGE, '=');
            break;
        } else {
            // if we have some left, then
            // lets run it ... and pass the
            // env along as well
            kont = rest;
            env  = k.env;
        }
    }

    // close up stuff ...
    READLINE.close();

    return results;
}

// -----------------------------------------------------------------------------


