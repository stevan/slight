
import {
    liftNumUnOp,      liftStrUnOp,
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

    // TODO
    // - say/warn
    // - sleep
    // - slurp/spew

    // -------------------------------------------------------------------------
    // Utils
    // -------------------------------------------------------------------------

    // pretty print any value
    builtins.set('pprint', new C.Native('pprint [any]:str', (args, env) => {
        let [ arg ] = args;
        return new C.Str( arg.pprint() );
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

    // TODO
    // - do/begin/progn
    // - abort
    // - assert
    // - time
    // - apply

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
    // conversions
    // -------------------------------------------------------------------------

    builtins.set('to-str',  new C.Native('to-str [any]:str',   (args, env) => args[0]!.toStr()));
    builtins.set('to-bool', new C.Native('to-bool [any]:bool', (args, env) => args[0]!.toBool()));

    builtins.set('str->int', new C.Native('str->int [str]:num', (args, env) => {
        let [ str ] = args;
        if (!(str instanceof C.Str)) throw new Error(`Can only call str->int on Str, not ${str.constructor.name}`);
        return new C.Num( Number.parseInt( str.value ) );
    }));

    builtins.set('str->float', new C.Native('str->float [str]:num', (args, env) => {
        let [ str ] = args;
        if (!(str instanceof C.Str)) throw new Error(`Can only call str->float on Str, not ${str.constructor.name}`);
        return new C.Num( Number.parseFloat( str.value ) );
    }));

    // -------------------------------------------------------------------------
    // numbers
    // -------------------------------------------------------------------------

    builtins.set('PI', new C.Num(Math.PI));

    // operators
    builtins.set('+',  new C.Native('+ [num;num]:num',  liftNumBinOp((n, m) => n + m)));
    builtins.set('-',  new C.Native('- [num;num]:num',  liftNumBinOp((n, m) => n - m)));
    builtins.set('*',  new C.Native('* [num;num]:num',  liftNumBinOp((n, m) => n * m)));
    builtins.set('/',  new C.Native('/ [num;num]:num',  liftNumBinOp((n, m) => n / m)));
    builtins.set('%',  new C.Native('% [num;num]:num',  liftNumBinOp((n, m) => n % m)));

    // numeric comparisons
    builtins.set('==', new C.Native('== [num;num]:bool', liftNumCompareOp((n, m) => n == m)));
    builtins.set('!=', new C.Native('!= [num;num]:bool', liftNumCompareOp((n, m) => n != m)));
    builtins.set('>=', new C.Native('>= [num;num]:bool', liftNumCompareOp((n, m) => n >= m)));
    builtins.set('>',  new C.Native( '> [num;num]:bool', liftNumCompareOp((n, m) => n >  m)));
    builtins.set('<=', new C.Native('<= [num;num]:bool', liftNumCompareOp((n, m) => n <= m)));
    builtins.set('<',  new C.Native( '< [num;num]:bool', liftNumCompareOp((n, m) => n <  m)));

    // numeric unary ops
    builtins.set('log',   new C.Native('log [num]:num',   liftNumUnOp(Math.log)));
    builtins.set('exp',   new C.Native('exp [num]:num',   liftNumUnOp(Math.exp)));
    builtins.set('abs',   new C.Native('abs [num]:num',   liftNumUnOp(Math.abs)));
    builtins.set('sin',   new C.Native('sin [num]:num',   liftNumUnOp(Math.sin)));
    builtins.set('cos',   new C.Native('cos [num]:num',   liftNumUnOp(Math.cos)));
    builtins.set('sqrt',  new C.Native('sqrt [num]:num',  liftNumUnOp(Math.sqrt)));
    builtins.set('atan',  new C.Native('atan [num]:num',  liftNumUnOp(Math.atan)));

    // numeric conversions
    builtins.set('ceil',  new C.Native('ceil [num]:num',  liftNumUnOp(Math.ceil)));
    builtins.set('floor', new C.Native('floor [num]:num', liftNumUnOp(Math.floor)));
    builtins.set('round', new C.Native('round [num]:num', liftNumUnOp(Math.round)));
    builtins.set('trunc', new C.Native('trunc [num]:num', liftNumUnOp(Math.trunc)));

    // random numbers
    builtins.set('rand', new C.Native('rand [num]:num', liftNumUnOp(Math.random)));

    // -------------------------------------------------------------------------
    // strings
    // -------------------------------------------------------------------------

    // concat
    builtins.set('~' , new C.Native('~ [str;str]:str',  liftStrBinOp((n, m) => n + m)));

    // string comparisons
    builtins.set('eq', new C.Native('eq [str;str]:bool', liftStrCompareOp((n, m) => n == m)));
    builtins.set('ne', new C.Native('ne [str;str]:bool', liftStrCompareOp((n, m) => n != m)));
    builtins.set('ge', new C.Native('ge [str;str]:bool', liftStrCompareOp((n, m) => n >= m)));
    builtins.set('gt', new C.Native('gt [str;str]:bool', liftStrCompareOp((n, m) => n >  m)));
    builtins.set('le', new C.Native('le [str;str]:bool', liftStrCompareOp((n, m) => n <= m)));
    builtins.set('lt', new C.Native('lt [str;str]:bool', liftStrCompareOp((n, m) => n <  m)));

    builtins.set('uc', new C.Native('uc [str]:str', liftStrUnOp((s) => s.toUpperCase())));
    builtins.set('lc', new C.Native('lc [str]:str', liftStrUnOp((s) => s.toLowerCase())));

    builtins.set('split', new C.Native('split [str;str]:list', (args, env) => {
        let [ seperator, string ] = args;
        if (!(seperator instanceof C.Str)) throw new Error(`Exepected Str for seperator`);
        if (!(string instanceof C.Str)) throw new Error(`Exepected Str for string`);
        return new C.Cons( string.value.split( seperator.value ).map( (s) => new C.Str(s) ) )
    }));

    builtins.set('join', new C.Native('join [str;list]:str', (args, env) => {
        let [ seperator, list ] = args;
        if (!(seperator instanceof C.Str)) throw new Error(`Exepected Str for seperator`);
        if (!(list instanceof C.Cons)) throw new Error(`Exepected List for list`);
        return new C.Str( list.toNativeArray().map((t) => t.toNativeStr()).join( seperator.value ) );
    }));

    // TODO
    // - length
    // - substr, char-at
    // - index, rindex
    // - sprintf
    // - lcfirst, ucfirst
    // - trim, chop, chomp
    // - chr, ord

    // -------------------------------------------------------------------------
    // booleans
    // -------------------------------------------------------------------------

    // unary negation
    builtins.set('!', new C.Native('! [bool]:bool', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Bool)) throw new Error(`Can only call ! on Bool, not ${arg.constructor.name}`);
        return new C.Bool( !arg.value );
    }));

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

    // -------------------------------------------------------------------------
    // Lists
    // -------------------------------------------------------------------------

    builtins.set('list' , new C.Native('list [...]:list', (args, env) => new C.Cons(args)));

    builtins.set('cons', new C.Native('cons [x;xs]:list', (args, env) => {
        let [ first, rest ] = args;
        if (rest instanceof C.Nil)  return new C.Cons([ first ]);
        if (rest instanceof C.Cons) return new C.Cons([ first, ...rest.toNativeArray() ]);
        return new C.Cons([ first, rest ]);
    }));

    builtins.set('first' , new C.Native('first [list]:any', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Cons))
            throw new Error(`Can only call first() on Cons, not ${arg.constructor.name}`);
        return arg.first;
    }));

    builtins.set('rest' , new C.Native('rest [list]:list', (args, env) => {
        let [ arg ] = args;
        if (!(arg instanceof C.Cons))
            throw new Error(`Can only call rest() on Cons, not ${arg.constructor.name}`);
        return arg.rest;
    }));

    // -------------------------------------------------------------------------
    // Tables
    // -------------------------------------------------------------------------

    builtins.set('table' , new C.Native('table [...]:table', (args, env) => new C.Table(args)));

    builtins.set('fetch', new C.Native('fetch [table;tag]:any',  (args, env) => {
        let [ table, tag ] = args;
        if (!(table instanceof C.Table)) throw new Error(`Expected table as first arg to fetch, not ${table.constructor.name}`);
        if (!(tag instanceof C.Tag)) throw new Error(`Expected tag as second arg to fetch, not ${tag.constructor.name}`);
        return table.fetch( tag );
    }));

    builtins.set('exists', new C.Native('exists [table;tag]:bool', (args, env) => {
        let [ table, tag ] = args;
        if (!(table instanceof C.Table)) throw new Error(`Expected table as first arg to exists, not ${table.constructor.name}`);
        if (!(tag instanceof C.Tag)) throw new Error(`Expected tag as second arg to exists, not ${tag.constructor.name}`);
        return new C.Bool( table.exists( tag ) );
    }));

    builtins.set('store', new C.Native('store [table;tag;any]:unit', (args, env) => {
        let [ table, tag, val ] = args;
        if (!(table instanceof C.Table)) throw new Error(`Expected table as first arg to store, not ${table.constructor.name}`);
        if (!(tag instanceof C.Tag)) throw new Error(`Expected tag as second arg to store, not ${tag.constructor.name}`);
        if (val == undefined) throw new Error(`Expected value as third arg to store`);
        table.store( tag, val );
        return new C.Unit();
    }));

    builtins.set('delete', new C.Native('delete [table;tag]:unit',  (args, env) => {
        let [ table, tag ] = args;
        if (!(table instanceof C.Table)) throw new Error(`Expected table as first arg to delete, not ${table.constructor.name}`);
        if (!(tag instanceof C.Tag)) throw new Error(`Expected tag as second arg to delete, not ${tag.constructor.name}`);
        table.delete( tag );
        return new C.Unit();
    }));

    // -------------------------------------------------------------------------
    // Functions
    // -------------------------------------------------------------------------

    // lambdas
    builtins.set('lambda', new C.FExpr('lambda [[params];body]:(λ + E)', (args, env) => {
        let [ params, body ] = args;
        return [ K.Return( new C.Lambda( params as C.Cons, body, env ), env ) ]
    }));

    // -------------------------------------------------------------------------
    // Definitions
    // -------------------------------------------------------------------------

    // definitions
    builtins.set('def', new C.FExpr('def [name;value]:(unit)', (args, env) => {
        let [ name, value ] = args;
        return [
            K.Define( name as C.Sym, env ),
            K.EvalExpr( value, env )
        ]
    }));

    // definitions
    builtins.set('defun', new C.FExpr('defun [[name;params...];body]:(unit)', (args, env) => {
        let [ sig, body ] = args;
        let name   = (sig as C.Cons).first;
        let params = (sig as C.Cons).rest;
        return [
            K.Define( name as C.Sym, env ),
            K.Return( new C.Lambda( params as C.Cons, body, env ), env )
        ]
    }));


    // -------------------------------------------------------------------------
    return new E.Environment(builtins);
}

export const ROOT_ENV = constructRootEnvironment();
