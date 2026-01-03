
import {
    liftNumBinOp,     liftStrBinOp,
    liftNumCompareOp, liftStrCompareOp,
} from './Util'

import * as C from './Terms'
import * as E from './Environment'
import * as K from './Kontinue'

// -----------------------------------------------------------------------------
// the base environment ()
// -----------------------------------------------------------------------------

export const constructRootEnvironment = () : E.Environment => {

    let builtins = new Map<string, C.Term>();

    // -------------------------------------------------------------------------
    // Utils
    // -------------------------------------------------------------------------

    builtins.set('pprint', new C.Native('pprint [any]:str', (args, env) => {
        let [ arg ] = args;
        return new C.Str( arg.toNativeStr() );
    }));

    // -------------------------------------------------------------------------
    // types & predicates
    // -------------------------------------------------------------------------

    builtins.set('type-of', new C.Native('type-of [any]:str', (args, env) => new C.Str( args[0]!.constructor.name )));

    builtins.set('literal?', new C.Native('literal? [any]:bool', (args, env) => new C.Bool( args[0]! instanceof C.Literal )));
    builtins.set('bool?',    new C.Native('bool? [any]:bool', (args, env) => new C.Bool( args[0]!.constructor == C.Bool )));
    builtins.set('num?',     new C.Native('num? [any]:bool',  (args, env) => new C.Bool( args[0]!.constructor == C.Num )));
    builtins.set('str?',     new C.Native('str? [any]:bool',  (args, env) => new C.Bool( args[0]!.constructor == C.Str )));
    builtins.set('sym?',     new C.Native('sym? [any]:bool',  (args, env) => new C.Bool( args[0]!.constructor == C.Sym )));

    builtins.set('list?', new C.Native('list? [any]:bool', (args, env) => new C.Bool( args[0]! instanceof C.List )));
    builtins.set('nil?',  new C.Native('nil? [any]:bool',  (args, env) => new C.Bool( args[0]!.constructor == C.Nil )));
    builtins.set('cons?', new C.Native('cons? [any]:bool', (args, env) => new C.Bool( args[0]!.constructor == C.Cons )));

    builtins.set('callable?',    new C.Native('callable? [any]:bool',    (args, env) => new C.Bool( args[0]! instanceof C.Callable)));
    builtins.set('operative?',   new C.Native('operative? [any]:bool',   (args, env) => new C.Bool( args[0]! instanceof C.Operative)));
    builtins.set('applicative?', new C.Native('applicative? [any]:bool', (args, env) => new C.Bool( args[0]! instanceof C.Applicative)));
    builtins.set('lambda?',      new C.Native('lambda? [any]:bool',      (args, env) => new C.Bool( args[0]!.constructor == C.Lambda )));
    builtins.set('native?',      new C.Native('native? [any]:bool',      (args, env) => new C.Bool( args[0]!.constructor == C.Native )));
    builtins.set('fexpr?',       new C.Native('fexpr? [any]:bool',       (args, env) => new C.Bool( args[0]!.constructor == C.FExpr )));

    builtins.set('exception?', new C.Native('exception? [any]:bool', (args, env) => new C.Bool( args[0]!.constructor == C.Exception )));

    // -------------------------------------------------------------------------
    // numbers
    // -------------------------------------------------------------------------

    builtins.set('+',  new C.Native('+ [num;num]:num',  liftNumBinOp((n, m) => n + m)));
    builtins.set('-',  new C.Native('- [num;num]:num',  liftNumBinOp((n, m) => n - m)));
    builtins.set('*',  new C.Native('* [num;num]:num',  liftNumBinOp((n, m) => n * m)));
    builtins.set('/',  new C.Native('/ [num;num]:num',  liftNumBinOp((n, m) => n / m)));
    builtins.set('%',  new C.Native('% [num;num]:num',  liftNumBinOp((n, m) => n % m)));

    builtins.set('==', new C.Native('== [num;num]:bool', liftNumCompareOp((n, m) => n == m)));
    builtins.set('!=', new C.Native('!= [num;num]:bool', liftNumCompareOp((n, m) => n != m)));
    builtins.set('>=', new C.Native('>= [num;num]:bool', liftNumCompareOp((n, m) => n >= m)));
    builtins.set('>',  new C.Native( '> [num;num]:bool', liftNumCompareOp((n, m) => n >  m)));
    builtins.set('<=', new C.Native('<= [num;num]:bool', liftNumCompareOp((n, m) => n <= m)));
    builtins.set('<',  new C.Native( '< [num;num]:bool', liftNumCompareOp((n, m) => n <  m)));

    // -------------------------------------------------------------------------
    // strings
    // -------------------------------------------------------------------------

    builtins.set('~' , new C.Native('~ [str;str]:str',  liftStrBinOp((n, m) => n + m)));

    builtins.set('eq', new C.Native('eq [str;str]:bool', liftStrCompareOp((n, m) => n == m)));
    builtins.set('ne', new C.Native('ne [str;str]:bool', liftStrCompareOp((n, m) => n != m)));
    builtins.set('ge', new C.Native('ge [str;str]:bool', liftStrCompareOp((n, m) => n >= m)));
    builtins.set('gt', new C.Native('gt [str;str]:bool', liftStrCompareOp((n, m) => n >  m)));
    builtins.set('le', new C.Native('le [str;str]:bool', liftStrCompareOp((n, m) => n <= m)));
    builtins.set('lt', new C.Native('lt [str;str]:bool', liftStrCompareOp((n, m) => n <  m)));

    // -------------------------------------------------------------------------
    // booleans
    // -------------------------------------------------------------------------

    builtins.set('!', new C.Native('! [bool]:bool', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Bool)) throw new Error(`Can only call ! on Bool, not ${arg.constructor.name}`);
        return new C.Bool( !arg.value );
    }));

    // -------------------------------------------------------------------------
    // lists
    // -------------------------------------------------------------------------

    builtins.set('cons', new C.Native('cons [x;xs]:list', (args, env) => {
        let [ first, rest ] = args;
        if (rest instanceof C.Nil)  return new C.Cons([ first ]);
        if (rest instanceof C.Cons) return new C.Cons([ first, ...rest.toNativeArray() ]);
        return new C.Cons([ first, rest ]);
    }));

    builtins.set('list' , new C.Native('list [...]:list', (args, env) => new C.Cons(args)));

    builtins.set('first' , new C.Native('first [list]:any', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Cons)) throw new Error(`Can only call first() on Cons, not ${arg.constructor.name}`);
        return arg.first;
    }));

    builtins.set('rest' , new C.Native('rest [list]:list', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Cons)) throw new Error(`Can only call rest() on Cons, not ${arg.constructor.name}`);
        return arg.rest;
    }));

    // -------------------------------------------------------------------------
    // Special Forms (FExprs)
    // -------------------------------------------------------------------------
    // short circuit AND

    builtins.set('&&', new C.FExpr('&& [any;any]:any', (args, env) => {
        let [ lhs, rhs ] = args;
        return [
            K.IfElse( lhs, rhs, lhs, env ),
            K.EvalExpr( lhs, env ),
        ]
    }));


    // short circuit OR

    builtins.set('||', new C.FExpr('|| [any;any]:any', (args, env) => {
        let [ lhs, rhs ] = args;
        return [
            K.IfElse( lhs, lhs, rhs, env ),
            K.EvalExpr( lhs, env ),
        ]
    }));

    // ternary condtional

    builtins.set('?:', new C.FExpr('?: [cond;any;any]:any', (args, env) => {
        let [ cond, ifTrue, ifFalse ] = args;
        return [
            K.IfElse( cond, ifTrue, ifFalse, env ),
            K.EvalExpr( cond, env ),
        ]
    }));

    // aliases
    builtins.set('not', builtins.get('!')!);
    builtins.set('and', builtins.get('&&')!);
    builtins.set('or',  builtins.get('||')!);
    builtins.set('if',  builtins.get('?:')!);

    // lambdas
    builtins.set('lambda', new C.FExpr('lambda [[params];body]:(λ + E)', (args, env) => {
        let [ params, body ] = args;
        return [
            K.Return(
                new C.Lambda( params as C.Cons, body, env ),
                env
            )
        ]
    }));

    // definitions
    builtins.set('defun', new C.FExpr('defun [[name;params...];body]:(unit)', (args, env) => {
        let [ sig, body ] = args;
        let name   = (sig as C.Cons).first;
        let params = (sig as C.Cons).rest;
        return [
            K.Define( name as C.Sym, env ),
            K.Return(
                new C.Lambda( params as C.Cons, body, env ),
                env
            )
        ]
    }));

    // quote
    builtins.set('quote', new C.FExpr('quote [any]:any', (args, env) => {
        let [expr] = args;
        return [ K.Return( expr, env ) ];
    }));

    // eval
    builtins.set('eval', new C.FExpr('eval [any]:any', (args, env) => {
        let [expr] = args;
        return [
            K.EvalTOS(env),
            K.EvalExpr(expr, env),
        ];
    }));

    // -------------------------------------------------------------------------
    // HOST functions
    // -------------------------------------------------------------------------

    builtins.set('print', new C.FExpr('print [any]:(unit)', (args, env) => {
        return [
            K.Host( 'IO::print', env, ...args ),
            K.EvalConsRest( new C.Cons(args), env )
        ]
    }));

    builtins.set('readline', new C.FExpr('readline []:string', (args, env) => {
        return [ K.Host( 'IO::readline', env, ...args ) ]
    }));

    builtins.set('repl', new C.FExpr('repl []:any', (args, env) => {
        return [ K.Host( 'IO::repl', env.capture(), ...args ) ]
    }));

    builtins.set('ai-repl', new C.FExpr('ai-repl [str]:any', (args, env) => {
        return [ K.Host( 'AI::repl', env.capture(), ...args ) ]
    }));

    // -------------------------------------------------------------------------
    // TODO:
    // -------------------------------------------------------------------------
    // - abort
    // - assert
    // -------------------------------------------------------------------------

    return new E.Environment(builtins);
}

export const ROOT_ENV = constructRootEnvironment();
