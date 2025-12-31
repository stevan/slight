
import { ROOT_ENV } from './Slight/Runtime'

import * as C from './Slight/Terms'
import * as E from './Slight/Environment'
import * as K from './Slight/Kontinue'

export * as Util   from './Slight/Util'
export { parse   } from './Slight/Parser';
export { compile } from './Slight/Compiler';

import { createInterface } from 'node:readline/promises';

// -----------------------------------------------------------------------------
// I/O
// -----------------------------------------------------------------------------

const READLINE = createInterface({
    input  : process.stdin,
    output : process.stdout,
});

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------

export type State = [
    K.Kontinue,    // last continuation processed
    K.Kontinue[],  // rest of the program queue
    number         // tick counter
];

export class Machine {
    public rootEnv : E.Environment;
    public queue   : K.Kontinue[];
    public running : boolean;
    public ticks   : number;

    constructor () {
        // start with a fresh one!
        this.rootEnv = ROOT_ENV.capture();
        this.queue   = [];
        this.ticks   = 0;
        this.running = false;
    }

    load (program : C.Term[]) : void {
        // compile all the expressions
        // and add a Halt at the end
        let compiled = [
            ...program.map((expr) => K.EvalExpr(expr, this.rootEnv)),
            K.Host('SYS::exit', this.rootEnv)
        ].reverse();
        // and then load it into the queue
        this.queue.push(...compiled);
    }

    async run () : Promise<State> {
        let results : State | undefined = undefined;

        try {
            let kont = [ ...this.queue ];
            this.running = true;
            while (this.running) {
                // run the program and collect the results
                results = this.runUntilHost(kont)!;

                let [ k, rest, tick ] = results;
                if (k.op == 'HOST') {
                    switch (k.handler) {
                    case 'SYS::exit':
                        this.running = false;
                        break;
                    case 'IO::print':
                        console.log("STDOUT: ", k.stack.map((t) => t.toNativeStr()));
                        this.returnValues(rest, new C.Nil()); // return unit
                        break;
                    case 'IO::readline':
                        let input = await READLINE.question('? ');
                        this.returnValues(rest, new C.Str(input));
                        break;
                    default:
                        throw new Error(`The handler ${k.handler} is not supported`);
                    }
                }

                // if we are done then print the results and exit
                if (rest.length == 0) {
                    break;
                } else {
                    // if we have some left, then
                    // lets run it ...
                    kont = rest;
                }
            }
        } catch (e) {
            console.log("WHOOPS!!!!!");
            throw e;
        } finally {
            this.running = false;
            // close up stuff ...
            READLINE.close();
        }

        if (results == undefined) throw new Error(`Results are undefined!`);

        return results;
    }

    // provides the starting continuation
    // for evaluating any expression
    evaluateTerm (expr : C.Term, env : E.Environment) : K.Kontinue {
        switch (expr.kind) {
        case 'Nil'    :
        case 'Num'    :
        case 'Str'    :
        case 'Bool'   :
        case 'Native' :
        case 'FExpr'  :
        case 'Lambda' : return K.Return( expr, env );
        case 'Sym'    : return K.Return( env.lookup( expr ), env );
        case 'Pair'   : return K.EvalPair( expr, env );
        case 'Cons'   : return K.EvalCons( expr, env );
        default:
            throw new Error(`Unrecognized Expression ${expr.constructor.name}`);
        }
    }

    // returns a value to the previous
    // continuation in the stack
    returnValues (kont : K.Kontinue[], ...values : C.Term[]) : void {
        if (kont.length == 0)
            throw new Error(`Cannot return value ${values.map((v) => v.toNativeStr()).join(', ')} without continuation`);
        let top = kont.at(-1) as K.Kontinue;
        top.stack.push( ...values );
    }

    // the step function ... !!!
    runUntilHost (kont : K.Kontinue[]) : State {
        while (kont.length > 0) {
            this.ticks++;
            let k = kont.pop() as K.Kontinue;
            switch (k.op) {
            // ---------------------------------------------------------------------
            // This is the end of HOST operation, an async exit point
            // ---------------------------------------------------------------------
            case 'HOST':
                return [ k, kont, this.ticks ];
            // ---------------------------------------------------------------------
            // This is for defining things in the environment
            // ---------------------------------------------------------------------
            case 'DEFINE':
                let body = k.stack.pop();
                if (body == undefined) throw new Error(`Expected body for DEFINE`);
                k.env.define( k.name, body );
                break;
            // ---------------------------------------------------------------------
            // This is a literal value to be returned to the
            // previous continuation in the stack
            // ---------------------------------------------------------------------
            case 'RETURN':
                this.returnValues( kont, k.value );
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
                            : this.evaluateTerm( k.ifTrue, k.env )
                    );
                } else {
                    kont.push(
                        (k.cond === k.ifFalse)
                            ? K.Return( cond, k.env )
                            : this.evaluateTerm( k.ifFalse, k.env )
                    );
                }
                break;
            // =====================================================================
            // Eval
            // =====================================================================
            // Main entry point
            // ---------------------------------------------------------------------
            case 'EVAL/EXPR':
                kont.push( this.evaluateTerm( k.expr, k.env ) );
                break;
            // ---------------------------------------------------------------------
            // Eval the Top of Stack
            // ---------------------------------------------------------------------
            case 'EVAL/TOS':
                let toEval = k.stack.pop();
                if (toEval === undefined) throw new Error('EVAL/TOS: empty stack');
                kont.push( this.evaluateTerm(toEval, k.env) );
                break;
            // ---------------------------------------------------------------------
            // Eval Pairs
            // ---------------------------------------------------------------------
            case 'EVAL/PAIR':
                let pair  = k.pair;
                kont.push(
                    K.EvalPairSecond( pair.second, k.env ),
                    this.evaluateTerm( pair.first, k.env ),
                );
                break;
            case 'EVAL/PAIR/SND':
                let second = this.evaluateTerm( k.second, k.env );
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
                kont.push( check, this.evaluateTerm( cons.head, k.env ) );
                break;
            case 'EVAL/CONS/TAIL':
                let tail = k.tail;
                if (tail instanceof C.Nil) throw new Error(`Tail is Nil!`);

                if (!((tail as C.Cons).tail instanceof C.Nil)) {
                    kont.push( K.EvalConsTail( (tail as C.Cons).tail, k.env ) );
                }

                k.stack.splice(0).forEach((evaled) => this.returnValues( kont, evaled ));
                kont.push( this.evaluateTerm( (tail as C.Cons).head, k.env ) );
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
        }

        // should never happen
        throw new Error(`WTF, this should never happen, we should always return`);
    }
}
