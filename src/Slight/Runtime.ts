
import {
    DEBUG,
    HEADER, FOOTER, LOG,
    GREEN, RED, ORANGE, YELLOW, BLUE, PURPLE, GREY,
} from './Logger'

import {
    liftNumBinOp,     liftStrBinOp,
    liftNumCompareOp, liftStrCompareOp,
} from './Util'

import * as C from './Terms'
import * as E from './Environment'
import * as K from './Kontinue'

// -----------------------------------------------------------------------------
// the base environment
// -----------------------------------------------------------------------------

export const ROOT_ENV = new E.Environment((query : C.Sym) : C.Term => {
    LOG(YELLOW, ` ~ lookup || ${query.toNativeStr()} in scope(_) `);
    switch (query.ident) {

    // -------------------------------------------------------------------------
    // everythings
    // -------------------------------------------------------------------------

    case 'type-of' : return new C.Native('type-of', (args, env) => {
        let [ arg ] = args;
        return new C.Str( arg.constructor.name );
    });

    case 'to-str' : return new C.Native('to-string', (args, env) => {
        let [ arg ] = args;
        return new C.Str( arg.toNativeStr() );
    });

    // -------------------------------------------------------------------------
    // numbers
    // -------------------------------------------------------------------------

    case '+'  : return new C.Native('+',  liftNumBinOp((n, m) => n + m));
    case '-'  : return new C.Native('-',  liftNumBinOp((n, m) => n - m));
    case '*'  : return new C.Native('*',  liftNumBinOp((n, m) => n * m));
    case '/'  : return new C.Native('/',  liftNumBinOp((n, m) => n / m));
    case '%'  : return new C.Native('%',  liftNumBinOp((n, m) => n % m));
    case '==' : return new C.Native('==', liftNumCompareOp((n, m) => n == m));
    case '!=' : return new C.Native('!=', liftNumCompareOp((n, m) => n != m));
    case '>=' : return new C.Native('>=', liftNumCompareOp((n, m) => n >= m));
    case '>'  : return new C.Native('>',  liftNumCompareOp((n, m) => n >  m));
    case '<=' : return new C.Native('<=', liftNumCompareOp((n, m) => n <= m));
    case '<'  : return new C.Native('<',  liftNumCompareOp((n, m) => n <  m));

    // -------------------------------------------------------------------------
    // strings
    // -------------------------------------------------------------------------

    case '~'  : return new C.Native('~',  liftStrBinOp((n, m) => n + m));
    case 'eq' : return new C.Native('eq', liftStrCompareOp((n, m) => n == m));
    case 'ne' : return new C.Native('ne', liftStrCompareOp((n, m) => n != m));
    case 'ge' : return new C.Native('ge', liftStrCompareOp((n, m) => n >= m));
    case 'gt' : return new C.Native('gt', liftStrCompareOp((n, m) => n >  m));
    case 'le' : return new C.Native('le', liftStrCompareOp((n, m) => n <= m));
    case 'lt' : return new C.Native('lt', liftStrCompareOp((n, m) => n <  m));

    // -------------------------------------------------------------------------
    // booleans
    // -------------------------------------------------------------------------

    case 'not' :
    case '!'   : return new C.Native('NOT', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Bool)) throw new Error(`Can only call ! on Bool, not ${arg.constructor.name}`);
        return new C.Bool( !arg.value );
    });

    // -------------------------------------------------------------------------
    // lists
    // -------------------------------------------------------------------------

    case 'cons': return new C.Native('cons', (args, env) => {
        let [ head, tail ] = args;
        if (tail instanceof C.Nil)  return new C.Cons([ head ]);
        if (tail instanceof C.Cons) return new C.Cons([ head, ...tail.toNativeArray() ]);
        return new C.Pair(head, tail);  // dotted pair
    });

    case 'list' : return new C.Native('list', (args, env) => new C.Cons(args));
    case 'head' : return new C.Native('head', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Cons)) throw new Error(`Can only call head() on Cons, not ${arg.constructor.name}`);
        return arg.head;
    });

    case 'tail' : return new C.Native('tail', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Cons)) throw new Error(`Can only call tail() on Cons, not ${arg.constructor.name}`);
        return arg.tail;
    });

    case 'nil?' : return new C.Native('nil?', (args, env) => {
        let [ arg ] = args;
        return new C.Bool( arg instanceof C.Nil );
    });

    // -------------------------------------------------------------------------
    // Special Forms (FExprs)
    // -------------------------------------------------------------------------
    // short circuit AND
    case 'and':
    case '&&' : return new C.FExpr('AND', (args, env) => {
        let [ lhs, rhs ] = args;
        return [
            K.IfElse( lhs, rhs, lhs, env ),
            K.EvalExpr( lhs, env ),
        ]
    });

    // short circuit OR
    case 'or' :
    case '||' : return new C.FExpr('OR', (args, env) => {
        let [ lhs, rhs ] = args;
        return [
            K.IfElse( lhs, lhs, rhs, env ),
            K.EvalExpr( lhs, env ),
        ]
    });

    // ternary condtional
    case 'if' :
    case '?:' : return new C.FExpr('?:', (args, env) => {
        let [ cond, ifTrue, ifFalse ] = args;
        return [
            K.IfElse( cond, ifTrue, ifFalse, env ),
            K.EvalExpr( cond, env ),
        ]
    });

    // lambdas
    case 'lambda' : return new C.FExpr('lambda', (args, env) => {
        let [ params, body ] = args;
        return [
            K.Return(
                new C.Lambda( params as C.Cons, body, env.capture() ),
                env
            )
        ]
    });

    // definitions
    case 'def' : return new C.FExpr('def', (args, env) => {
        let [ sig, body ] = args;
        let name   = (sig as C.Cons).head;
        let params = (sig as C.Cons).tail;
        return [
            K.Define( name as C.Sym, env ),
            K.Return(
                new C.Lambda( params as C.Cons, body, env.capture() ),
                env
            )
        ]
    });

    // quote
    case 'quote' : return new C.FExpr('quote', (args, env) => {
        let [expr] = args;
        return [ K.Return( expr, env ) ];
    });

    // eval
    case 'eval' : return new C.FExpr('eval', (args, env) => {
        let [expr] = args;
        return [
            K.EvalTOS(env),
            K.EvalExpr(expr, env),
        ];
    });

    // -------------------------------------------------------------------------
    // HOST functions
    // -------------------------------------------------------------------------

    case 'print' : return new C.FExpr('print', (args, env) => {
        return [
            K.Host( 'IO::print', env ),
            K.EvalConsTail( new C.Cons(args), env )
        ]
    });

    case 'readline' : return new C.FExpr('readline', (args, env) => {
        let [ name ] = args;
        return [
            K.Define( name as C.Sym, env ),
            K.Host( 'IO::readline', env ),
        ]
    });

    // -------------------------------------------------------------------------
    // TODO:
    // -------------------------------------------------------------------------
    // - abort
    // - assert
    // -------------------------------------------------------------------------
    default:
        throw new Error(`Unable to find ${query.ident} in Scope`);
    }
});
