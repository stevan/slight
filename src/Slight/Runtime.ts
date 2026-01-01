
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
    // everythings
    // -------------------------------------------------------------------------

    builtins.set('type-of', new C.Native('type-of', (args, env) => {
        let [ arg ] = args;
        return new C.Str( arg.constructor.name );
    }));

    builtins.set('to-str', new C.Native('to-string', (args, env) => {
        let [ arg ] = args;
        return new C.Str( arg.toNativeStr() );
    }));

    // -------------------------------------------------------------------------
    // numbers
    // -------------------------------------------------------------------------

    builtins.set('+',  new C.Native('+',  liftNumBinOp((n, m) => n + m)));
    builtins.set('-',  new C.Native('-',  liftNumBinOp((n, m) => n - m)));
    builtins.set('*',  new C.Native('*',  liftNumBinOp((n, m) => n * m)));
    builtins.set('/',  new C.Native('/',  liftNumBinOp((n, m) => n / m)));
    builtins.set('%',  new C.Native('%',  liftNumBinOp((n, m) => n % m)));
    builtins.set('==', new C.Native('==', liftNumCompareOp((n, m) => n == m)));
    builtins.set('!=', new C.Native('!=', liftNumCompareOp((n, m) => n != m)));
    builtins.set('>=', new C.Native('>=', liftNumCompareOp((n, m) => n >= m)));
    builtins.set('>',  new C.Native('>',  liftNumCompareOp((n, m) => n >  m)));
    builtins.set('<=', new C.Native('<=', liftNumCompareOp((n, m) => n <= m)));
    builtins.set('<',  new C.Native('<',  liftNumCompareOp((n, m) => n <  m)));

    // -------------------------------------------------------------------------
    // strings
    // -------------------------------------------------------------------------

    builtins.set('~' , new C.Native('~',  liftStrBinOp((n, m) => n + m)));
    builtins.set('eq', new C.Native('eq', liftStrCompareOp((n, m) => n == m)));
    builtins.set('ne', new C.Native('ne', liftStrCompareOp((n, m) => n != m)));
    builtins.set('ge', new C.Native('ge', liftStrCompareOp((n, m) => n >= m)));
    builtins.set('gt', new C.Native('gt', liftStrCompareOp((n, m) => n >  m)));
    builtins.set('le', new C.Native('le', liftStrCompareOp((n, m) => n <= m)));
    builtins.set('lt', new C.Native('lt', liftStrCompareOp((n, m) => n <  m)));

    // -------------------------------------------------------------------------
    // booleans
    // -------------------------------------------------------------------------

    builtins.set('!', new C.Native('NOT', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Bool)) throw new Error(`Can only call ! on Bool, not ${arg.constructor.name}`);
        return new C.Bool( !arg.value );
    }));


    // -------------------------------------------------------------------------
    // lists
    // -------------------------------------------------------------------------

    builtins.set('cons', new C.Native('cons', (args, env) => {
        let [ head, tail ] = args;
        if (tail instanceof C.Nil)  return new C.Cons([ head ]);
        if (tail instanceof C.Cons) return new C.Cons([ head, ...tail.toNativeArray() ]);
        return new C.Pair(head, tail);  // dotted pair
    }));

    builtins.set('list' , new C.Native('list', (args, env) => new C.Cons(args)));
    builtins.set('head' , new C.Native('head', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Cons)) throw new Error(`Can only call head() on Cons, not ${arg.constructor.name}`);
        return arg.head;
    }));

    builtins.set('tail' , new C.Native('tail', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Cons)) throw new Error(`Can only call tail() on Cons, not ${arg.constructor.name}`);
        return arg.tail;
    }));

    builtins.set('nil?' , new C.Native('nil?', (args, env) => {
        let [ arg ] = args;
        return new C.Bool( arg instanceof C.Nil );
    }));

    // -------------------------------------------------------------------------
    // Special Forms (FExprs)
    // -------------------------------------------------------------------------
    // short circuit AND

    builtins.set('&&', new C.FExpr('AND', (args, env) => {
        let [ lhs, rhs ] = args;
        return [
            K.IfElse( lhs, rhs, lhs, env ),
            K.EvalExpr( lhs, env ),
        ]
    }));


    // short circuit OR

    builtins.set('||', new C.FExpr('OR', (args, env) => {
        let [ lhs, rhs ] = args;
        return [
            K.IfElse( lhs, lhs, rhs, env ),
            K.EvalExpr( lhs, env ),
        ]
    }));

    // ternary condtional

    builtins.set('?:', new C.FExpr('?:', (args, env) => {
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
    builtins.set('lambda', new C.FExpr('lambda', (args, env) => {
        let [ params, body ] = args;
        return [
            K.Return(
                new C.Lambda( params as C.Cons, body, env ),
                env
            )
        ]
    }));

    // definitions
    builtins.set('defun', new C.FExpr('defun', (args, env) => {
        let [ sig, body ] = args;
        let name   = (sig as C.Cons).head;
        let params = (sig as C.Cons).tail;
        return [
            K.Define( name as C.Sym, env ),
            K.Return(
                new C.Lambda( params as C.Cons, body, env ),
                env
            )
        ]
    }));

    // quote
    builtins.set('quote', new C.FExpr('quote', (args, env) => {
        let [expr] = args;
        return [ K.Return( expr, env ) ];
    }));

    // eval
    builtins.set('eval', new C.FExpr('eval', (args, env) => {
        let [expr] = args;
        return [
            K.EvalTOS(env),
            K.EvalExpr(expr, env),
        ];
    }));

    // -------------------------------------------------------------------------
    // HOST functions
    // -------------------------------------------------------------------------

    builtins.set('print', new C.FExpr('print', (args, env) => {
        return [
            K.Host( 'IO::print', env, ...args ),
            K.EvalConsTail( new C.Cons(args), env )
        ]
    }));

    builtins.set('readline', new C.FExpr('readline', (args, env) => {
        return [ K.Host( 'IO::readline', env, ...args ) ]
    }));

    builtins.set('repl', new C.FExpr('repl', (args, env) => {
        return [ K.Host( 'IO::repl', env, ...args ) ]
    }));

    builtins.set('ai-repl', new C.FExpr('ai-repl', (args, env) => {
        return [ K.Host( 'AI::repl', env, ...args ) ]
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
