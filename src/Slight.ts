
import {
    DEBUG,
    HEADER, FOOTER, LOG,
    GREEN, RED, ORANGE, YELLOW, BLUE, PURPLE, GREY,
} from './Slight/Logger'

import {
    liftNumBinOp,     liftStrBinOp,
    liftNumCompareOp, liftStrCompareOp,
} from './Slight/Util'

import * as C from './Slight/Terms'
import * as E from './Slight/Environment'
import * as K from './Slight/Kontinue'

export * as Util   from './Slight/Util'
export { parse   } from './Slight/Parser';
export { compile } from './Slight/Compiler';

// -----------------------------------------------------------------------------
// the base environment
// -----------------------------------------------------------------------------

export const ROOT_ENV = new E.Environment((query : C.Sym) : C.Term => {
    LOG(YELLOW, ` ~ lookup || ${query.toNativeStr()} in scope(_) `);
    switch (query.ident) {
    case '+'  : return new C.Native('+',  liftNumBinOp((n, m) => n + m));
    case '-'  : return new C.Native('-',  liftNumBinOp((n, m) => n - m));
    case '*'  : return new C.Native('*',  liftNumBinOp((n, m) => n * m));
    case '/'  : return new C.Native('/',  liftNumBinOp((n, m) => n / m));
    case '%'  : return new C.Native('%',  liftNumBinOp((n, m) => n % m));
    case '>=' : return new C.Native('>=', liftNumCompareOp((n, m) => n >= m));
    case '>'  : return new C.Native('>',  liftNumCompareOp((n, m) => n >  m));
    case '<=' : return new C.Native('<=', liftNumCompareOp((n, m) => n <= m));
    case '<'  : return new C.Native('<',  liftNumCompareOp((n, m) => n <  m));
    case '==' : return new C.Native('==', liftNumCompareOp((n, m) => n == m));
    case '!=' : return new C.Native('!=', liftNumCompareOp((n, m) => n != m));
    case '~'  : return new C.Native('~',  liftStrBinOp((n, m) => n + m));
    case 'ge' : return new C.Native('ge', liftStrCompareOp((n, m) => n >= m));
    case 'gt' : return new C.Native('gt', liftStrCompareOp((n, m) => n >  m));
    case 'le' : return new C.Native('le', liftStrCompareOp((n, m) => n <= m));
    case 'lt' : return new C.Native('lt', liftStrCompareOp((n, m) => n <  m));
    case 'eq' : return new C.Native('eq', liftStrCompareOp((n, m) => n == m));
    case 'ne' : return new C.Native('ne', liftStrCompareOp((n, m) => n != m));

    case 'list' : return new C.Native('list', (args, env) => new C.Cons(args));


    // Special Forms ...

    case 'lambda' : return new C.FExpr('lambda', (args, env) => {
        let [ params, body ] = args;
        return [
            new K.Return(
                new C.Lambda( params as C.Cons, body, env.capture() ),
                env
            )
        ]
    });

    case 'def' : return new C.FExpr('define', (args, env) => {
        let [ name, body ] = args;
        return [
            new K.Definition( name as C.Sym, env ),
            new K.EvalExpr( body, env ),
        ]
    });
    default:
        throw new Error(`Unable to find ${query.ident} in Scope`);
    }
});

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------

export type State = [ C.Term[], E.Environment, K.Kontinue[], number ];

export function run (program : C.Term[]) : State {

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
        case C.Lambda : return new K.Return(expr, env);
        case C.Sym    : return new K.Return(env.lookup( expr as C.Sym ), env);
        case C.Pair   : return new K.EvalPair( expr as C.Pair, env );
        case C.Cons   : return new K.EvalCons( expr as C.Cons, env );
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
            LOG(GREY, `KONT :\n `, kont.toReversed().map((k) => k.toString()).join("\n  "));
        }

        let tick = 0;

        HEADER(YELLOW, `Begin Statement`, '_');
        while (kont.length > 0) {
            tick++;
            let k = kont.pop() as K.Kontinue;
            HEADER(PURPLE, `STEP(${tick})`, '-');
            LOG(RED, `=> K : `, k.toString());
            switch (k.constructor) {
            // ---------------------------------------------------------------------
            // This is the end of a statement, main exit point
            // ---------------------------------------------------------------------
            case K.Halt:
                HEADER(YELLOW, `Halt`, '_');
                return [ k.stack, k.env, kont, tick ];
            // ---------------------------------------------------------------------
            // This is for defining things in the environment
            // ---------------------------------------------------------------------
            case K.Definition:
                let body = k.stack.pop() as C.Term;
                k.env.define( (k as K.Definition).name, body );
                break;
            // ---------------------------------------------------------------------
            // This is a literal value to be returned to the
            // previous continuation in the stack
            // ---------------------------------------------------------------------
            case K.Return:
                returnValues( kont, (k as K.Return).value );
                break;
            // =====================================================================
            // Eval
            // =====================================================================
            // Main entry point
            // ---------------------------------------------------------------------
            case K.EvalExpr:
                kont.push( evaluateTerm( (k as K.EvalExpr).expr, k.env ) );
                break;
            // ---------------------------------------------------------------------
            // Eval Pairs
            // ---------------------------------------------------------------------
            case K.EvalPair:
                let pair  = (k as K.EvalPair).pair;
                kont.push(
                    new K.EvalPairSecond( pair.second, k.env ),
                    evaluateTerm( pair.first, k.env ),
                );
                break;
            case K.EvalPairSecond:
                let second = evaluateTerm( (k as K.EvalPairSecond).second, k.env );
                let efirst = k.stack.pop() as C.Term;
                let mkPair = new K.MakePair( k.env );
                mkPair.stack.push(efirst);
                kont.push( mkPair, second );
                break;
            case K.MakePair:
                let snd = k.stack.pop();
                let fst = k.stack.pop();
                if (fst == undefined) throw new Error('Expected fst on stack');
                if (snd == undefined) throw new Error('Expected snd on stack');
                kont.push( new K.Return( new C.Pair( fst as C.Term, snd as C.Term ), k.env ) );
                break;
            // ---------------------------------------------------------------------
            // Eval Lists
            // ---------------------------------------------------------------------
            case K.EvalCons:
                let cons  = (k as K.EvalCons).cons;
                let check = new K.ApplyExpr( cons.tail, k.env );
                kont.push( check, evaluateTerm( cons.head, k.env ) );
                break;
            case K.EvalConsTail:
                let tail = (k as K.EvalConsTail).tail;
                if (tail instanceof C.Nil) throw new Error(`Tail is Nil!`);

                if (!((tail as C.Cons).tail instanceof C.Nil)) {
                    kont.push( new K.EvalConsTail( (tail as C.Cons).tail, k.env ) );
                }

                let evaled = k.stack.pop();
                if (evaled != undefined) {
                    returnValues( kont, evaled );
                }

                kont.push( evaluateTerm( (tail as C.Cons).head, k.env ) );
                break;
            // ---------------------------------------------------------------------
            // Handle function calls
            // ---------------------------------------------------------------------
            case K.ApplyExpr:
                let call = k.stack.pop();
                if (call == undefined) throw new Error('Expected call on stack');
                if (call instanceof C.Operative) {
                    kont.push(new K.ApplyOperative( (call as C.FExpr), (k as K.ApplyExpr).args, k.env ));
                }
                else if (call instanceof C.Applicative) {
                    kont.push(
                        new K.ApplyApplicative( (call as C.Applicative), k.env ),
                        new K.EvalConsTail( (k as K.ApplyExpr).args, k.env )
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
            case K.ApplyOperative:
                kont.push(...((k as K.ApplyOperative).call as C.FExpr).body(
                    ((k as K.ApplyOperative).args as C.Cons).toNativeArray(),
                    k.env
                ));
                break;
            // ---------------------------------------------------------------------
            // Applicatives, or Lambdas & Native Functions
            // - arguments are evaluated
            // ---------------------------------------------------------------------
            case K.ApplyApplicative:
                switch ((k as K.ApplyApplicative).call.constructor) {
                case C.Native:
                    kont.push(new K.Return(
                        ((k as K.ApplyApplicative).call as C.Native).body( k.stack, k.env ),
                        k.env
                    ));
                    break;
                case C.Lambda:
                    let lambda  = (k as K.ApplyApplicative).call as C.Lambda;
                    let local   = lambda.env;

                    let params  = lambda.params.toNativeArray();
                    let args    = k.stack;
                    kont.push( new K.EvalExpr( lambda.body, local.derive( params as C.Sym[], args ) ) );
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
        ...program.map((expr) => new K.EvalExpr(expr, env)),
        new K.Halt(env)
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


