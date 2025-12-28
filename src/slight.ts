
import {
    DEBUG,
    HEADER, FOOTER, LOG,
    GREEN, RED, ORANGE, YELLOW, BLUE, PURPLE, GREY,
} from './Slight/Logger'

import { Environment } from './Slight/Environment'

import * as Terms    from './Slight/Terms'
import * as Kontinue from './Slight/Kontinue'
import * as Util     from './Slight/Util'

export { parse   } from './Slight/Parser';
export { compile } from './Slight/Compiler';

// -----------------------------------------------------------------------------
// the base environment
// -----------------------------------------------------------------------------

export const ROOT_ENV = new Environment((query : Terms.Sym) : Terms.Term => {
    LOG(YELLOW, ` ~ lookup || ${query.toNativeStr()} in scope(_) `);
    switch (query.ident) {
    case '+'  : return new Terms.Native('+',  Util.liftNumBinOp((n, m) => n + m));
    case '-'  : return new Terms.Native('-',  Util.liftNumBinOp((n, m) => n - m));
    case '*'  : return new Terms.Native('*',  Util.liftNumBinOp((n, m) => n * m));
    case '/'  : return new Terms.Native('/',  Util.liftNumBinOp((n, m) => n / m));
    case '%'  : return new Terms.Native('%',  Util.liftNumBinOp((n, m) => n % m));
    case '>=' : return new Terms.Native('>=', Util.liftNumCompareOp((n, m) => n >= m));
    case '>'  : return new Terms.Native('>',  Util.liftNumCompareOp((n, m) => n >  m));
    case '<=' : return new Terms.Native('<=', Util.liftNumCompareOp((n, m) => n <= m));
    case '<'  : return new Terms.Native('<',  Util.liftNumCompareOp((n, m) => n <  m));
    case '==' : return new Terms.Native('==', Util.liftNumCompareOp((n, m) => n == m));
    case '!=' : return new Terms.Native('!=', Util.liftNumCompareOp((n, m) => n != m));
    case '~'  : return new Terms.Native('~',  Util.liftStrBinOp((n, m) => n + m));
    case 'ge' : return new Terms.Native('ge', Util.liftStrCompareOp((n, m) => n >= m));
    case 'gt' : return new Terms.Native('gt', Util.liftStrCompareOp((n, m) => n >  m));
    case 'le' : return new Terms.Native('le', Util.liftStrCompareOp((n, m) => n <= m));
    case 'lt' : return new Terms.Native('lt', Util.liftStrCompareOp((n, m) => n <  m));
    case 'eq' : return new Terms.Native('eq', Util.liftStrCompareOp((n, m) => n == m));
    case 'ne' : return new Terms.Native('ne', Util.liftStrCompareOp((n, m) => n != m));

    case 'list' : return new Terms.Native('list', (args, env) => new Terms.Cons(args));


    // Special Forms ...

    case 'lambda' : return new Terms.FExpr('lambda', (args, env) => {
        let [ params, body ] = args;
        return [
            new Kontinue.Return(
                new Terms.Lambda( params as Terms.Cons, body, env.capture() ),
                env
            )
        ]
    });

    case 'def' : return new Terms.FExpr('define', (args, env) => {
        let [ name, body ] = args;
        //env.define( name as Sym, body );
        return [
            new Kontinue.Definition( name as Terms.Sym, env ),
            new Kontinue.EvalExpr( body, env ),
        ]
    });
    default:
        throw new Error(`Unable to find ${query.ident} in Scope`);
    }
});

// -----------------------------------------------------------------------------
// State is a WIP
// -----------------------------------------------------------------------------
//
// currently it is:
// - the stack of the final continuation
// - the current Environment
// - the continuation stack
// - the step number
// - the number of ticks run
//
// The step function returns this after each expression
// and run function just collects them in a list
// and returns it.
//
// Not ideal, but works for now as we can see
// everything that is going on.
// -----------------------------------------------------------------------------

export type State = [ Terms.Term[], Environment, Kontinue.Kontinue[], number ];

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------

export function run (program : Terms.Term[]) : State {

    // provides the starting continuation
    // for evaluating any expression
    const evaluateTerm = (expr : Terms.Term, env : Environment) : Kontinue.Kontinue => {
        HEADER(BLUE, `EVAL`, '.');
        LOG(BLUE, `[ ${expr.toNativeStr()} ] + ENV ${env.toNativeStr()}`);
        switch (expr.constructor) {
        case Terms.Nil    :
        case Terms.Num    :
        case Terms.Str    :
        case Terms.Bool   :
        case Terms.Native :
        case Terms.FExpr  :
        case Terms.Lambda : return new Kontinue.Return(expr, env);
        case Terms.Sym    : return new Kontinue.Return(env.lookup( expr as Terms.Sym ), env);
        case Terms.Pair   : return new Kontinue.EvalPair( expr as Terms.Pair, env );
        case Terms.Cons   : return new Kontinue.EvalCons( expr as Terms.Cons, env );
        default:
            throw new Error(`Unrecognized Expression ${expr.constructor.name}`);
        }
    }

    // returns a value to the previous
    // continuation in the stack
    const returnValues = (kont : Kontinue.Kontinue[], ...values : Terms.Term[]) : void => {
        if (kont.length == 0)
            throw new Error(`Cannot return value ${values.map((v) => v.toNativeStr()).join(', ')} without continuation`);
        let top = (kont.at(-1) as Kontinue.Kontinue);
        top.stack.push( ...values );
    }

    // the step function ... !!!
    const execute = (startEnv : Environment, kont : Kontinue.Kontinue[]) : State => {
        HEADER(GREEN, `START`, '=');
        LOG(GREEN, `EVAL in ${startEnv.toNativeStr()}`);
        if (kont.length == 0) {
            LOG(GREY, `KONT : ~`);
        }
        else {
            LOG(GREY, `KONT :\n `, kont.toReversed().map((k) => k.toString()).join("\n  "));
        }

        let tick = 0;

        HEADER(YELLOW, `Begin Statement`, '_');
        while (kont.length > 0) {
            tick++;
            let k = kont.pop() as Kontinue.Kontinue;
            HEADER(PURPLE, `STEP(${tick})`, '-');
            LOG(RED, `=> K : `, k.toString());
            switch (k.constructor) {
            // ---------------------------------------------------------------------
            // This is the end of a statement, main exit point
            // ---------------------------------------------------------------------
            case Kontinue.Halt:
                HEADER(YELLOW, `Halt`, '_');
                return [ k.stack, (k as Kontinue.Kontinue).env, kont, tick ];
            // ---------------------------------------------------------------------
            // This is for defining things in the environment
            // ---------------------------------------------------------------------
            case Kontinue.Definition:
                let body = k.stack.pop() as Terms.Term;
                (k as Kontinue.Kontinue).env.define( (k as Kontinue.Definition).name, body );
                break;
            // ---------------------------------------------------------------------
            // This is a literal value to be returned to the
            // previous continuation in the stack
            // ---------------------------------------------------------------------
            case Kontinue.Return:
                returnValues( kont, (k as Kontinue.Return).value );
                break;
            // =====================================================================
            // Eval
            // =====================================================================
            // Main entry point
            // ---------------------------------------------------------------------
            case Kontinue.EvalExpr:
                kont.push( evaluateTerm( (k as Kontinue.EvalExpr).expr, (k as Kontinue.Kontinue).env ) );
                break;
            // ---------------------------------------------------------------------
            // Eval Pairs
            // ---------------------------------------------------------------------
            case Kontinue.EvalPair:
                let pair  = (k as Kontinue.EvalPair).pair;
                kont.push(
                    new Kontinue.EvalPairSecond( pair.second, (k as Kontinue.Kontinue).env ),
                    evaluateTerm( pair.first, (k as Kontinue.Kontinue).env ),
                );
                break;
            case Kontinue.EvalPairSecond:
                let second = evaluateTerm( (k as Kontinue.EvalPairSecond).second, (k as Kontinue.Kontinue).env );
                let efirst = k.stack.pop() as Terms.Term;
                let mkPair = new Kontinue.MakePair( (k as Kontinue.Kontinue).env );
                mkPair.stack.push(efirst);
                kont.push( mkPair, second );
                break;
            case Kontinue.MakePair:
                let snd = k.stack.pop();
                let fst = k.stack.pop();
                if (fst == undefined) throw new Error('Expected fst on stack');
                if (snd == undefined) throw new Error('Expected snd on stack');
                kont.push( new Kontinue.Return( new Terms.Pair( fst as Terms.Term, snd as Terms.Term ), (k as Kontinue.Kontinue).env ) );
                break;
            // ---------------------------------------------------------------------
            // Eval Lists
            // ---------------------------------------------------------------------
            case Kontinue.EvalCons:
                let cons  = (k as Kontinue.EvalCons).cons;
                let check = new Kontinue.ApplyExpr( cons.tail, (k as Kontinue.Kontinue).env );
                kont.push( check, evaluateTerm( cons.head, (k as Kontinue.Kontinue).env ) );
                break;
            case Kontinue.EvalConsTail:
                let tail = (k as Kontinue.EvalConsTail).tail;
                if (tail instanceof Terms.Nil) throw new Error(`Tail is Nil!`);

                if (!((tail as Terms.Cons).tail instanceof Terms.Nil)) {
                    kont.push( new Kontinue.EvalConsTail( (tail as Terms.Cons).tail, (k as Kontinue.Kontinue).env ) );
                }

                let evaled = k.stack.pop();
                if (evaled != undefined) {
                    returnValues( kont, evaled );
                }

                kont.push( evaluateTerm( (tail as Terms.Cons).head, (k as Kontinue.Kontinue).env ) );
                break;
            // ---------------------------------------------------------------------
            // Handle function calls
            // ---------------------------------------------------------------------
            case Kontinue.ApplyExpr:
                let call = k.stack.pop();
                if (call == undefined) throw new Error('Expected call on stack');
                if (call instanceof Terms.Operative) {
                    kont.push(new Kontinue.ApplyOperative( (call as Terms.FExpr), (k as Kontinue.ApplyExpr).args, (k as Kontinue.Kontinue).env ));
                }
                else if (call instanceof Terms.Applicative) {
                    kont.push(
                        new Kontinue.ApplyApplicative( (call as Terms.Applicative), (k as Kontinue.Kontinue).env ),
                        new Kontinue.EvalConsTail( (k as Kontinue.ApplyExpr).args, (k as Kontinue.Kontinue).env )
                    );
                }
                else {
                    throw new Error(`What to do with call -> ${call.constructor.name}??`);
                }
                break;
            // =====================================================================
            // APPLY
            // =====================================================================
            // Operatives, or FExprs
            // - the arguments are not evaluated
            // ---------------------------------------------------------------------
            case Kontinue.ApplyOperative:
                kont.push(...((k as Kontinue.ApplyOperative).call as Terms.FExpr).body(
                    ((k as Kontinue.ApplyOperative).args as Terms.Cons).toNativeArray(),
                    (k as Kontinue.Kontinue).env
                ));
                break;
            // ---------------------------------------------------------------------
            // Applicatives, or Lambdas & Native Functions
            // - arguments are evaluated
            // ---------------------------------------------------------------------
            case Kontinue.ApplyApplicative:
                switch ((k as Kontinue.ApplyApplicative).call.constructor) {
                case Terms.Native:
                    kont.push(new Kontinue.Return(
                        ((k as Kontinue.ApplyApplicative).call as Terms.Native).body( k.stack, (k as Kontinue.Kontinue).env ),
                        (k as Kontinue.Kontinue).env
                    ));
                    break;
                case Terms.Lambda:
                    let lambda  = (k as Kontinue.ApplyApplicative).call as Terms.Lambda;
                    let local   = lambda.env;

                    let params  = lambda.params.toNativeArray();
                    let args    = k.stack;
                    kont.push( new Kontinue.EvalExpr( lambda.body, local.derive( params as Terms.Sym[], args ) ) );
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
                LOG(GREY, `KONT :\n `, kont.toReversed().map((k) => k.toString()).join("\n  "));
            }
        }

        // should never happen
        return [ [], startEnv, kont, tick ];
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
        ...program.map((expr) => new Kontinue.EvalExpr(expr, env)),
        new Kontinue.Halt(env)
    ].reverse();

    // run the program and collect the results
    let results = execute(env, kont);

    HEADER(ORANGE, `RESULT(s)`, '=');
    if (results != undefined) {
        let [ stack, env, kont, tick ] = results;
        LOG(ORANGE, [
            `STEPS[${tick.toString().padStart(3, '0')}] =>`,
            `STACK : ${stack.map((t) => t.toNativeStr()).join(', ')};`,
            `ENV : ${env.toNativeStr()};`,
            `KONT : [${kont.map((k) => k.toString()).join(', ')}]`,
        ].join(' '));
    } else {
        throw new Error('Expected result from step, got undefined')
    }
    FOOTER(ORANGE, '=');

    return results;
}

// -----------------------------------------------------------------------------


