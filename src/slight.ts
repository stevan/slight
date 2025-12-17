
import * as util from 'node:util';

const originalConsoleLog = console.log;
console.log = (...args) => {
    originalConsoleLog(
        ...args.map((arg) =>
            typeof arg === 'string'
                ? arg
                : util.inspect(arg, {
                    depth: null,
                    colors: true,
                })
        )
    );
};

// -----------------------------------------------------------------------------
// Terms
// -----------------------------------------------------------------------------

abstract class Term {
    abstract toNativeStr () : string;

    toStr () : Str { return new Str(this.toNativeStr()) }
}

// -----------------------------------------------------------------------------

class Nil extends Term {
    override toNativeStr () : string { return 'nil' }
}

class Bool extends Term {
    public value : boolean;

    constructor (value : boolean) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return this.value ? 'true' : 'false' }
}

class Num  extends Term {
    public value : number;

    constructor (value : number) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return this.value.toString() }
}

class Str  extends Term {
    public value : string;

    constructor (value : string) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return `"${this.value}"` }
}

class Sym  extends Term {
    public ident : string;

    constructor (ident : string) {
        super();
        this.ident = ident;
    }

    override toNativeStr () : string { return '`'+this.ident }
}

// -----------------------------------------------------------------------------

class Pair extends Term {
    public first  : Term;
    public second : Term;

    constructor (fst : Term, snd : Term) {
        super();
        this.first  = fst;
        this.second = snd;
    }

    override toNativeStr () : string {
        return `(${this.first.toNativeStr()} . ${this.second.toNativeStr()})`
    }
}

// -----------------------------------------------------------------------------

abstract class List<T extends Term> extends Term {
    public items  : T[];
    public offset : number;

    constructor (items : T[], offset : number = 0) {
        super();
        this.items  = items;
        this.offset = offset;
    }

    at (i : number) : T {
        if ((this.offset + i) > this.items.length) throw new Error('OVERFLOW!');
        return this.items[ this.offset + i ];
    }

    mapItems<U> (f : (i : T) => U) : U[] {
        let list = [];
        for (let i = 0; i < this.length; i++) {
            list.push( f( this.at(i) ) );
        }
        return list;
    }

    get length () : number { return this.items.length - this.offset }
    get head   () : T      { return this.items[this.offset] }

    abstract get tail () : Term;

    toNativeArray () : Term[] {
        let list = [];
        for (let i = 0; i < this.length; i++) {
            list.push( this.at(i) );
        }
        return list;
    }

    override toNativeStr () : string {
        return `(${ this.items.slice(this.offset, this.items.length).map((i) => i.toNativeStr()).join(' ') })`
    }
}

class Cons extends List<Term> {
    get tail () : Cons | Nil {
        if (this.length == 1) return new Nil();
        return new Cons(this.items, this.offset + 1);
    }

    map (f : (i : Term) => Term) : Cons {
        return new Cons( this.mapItems<Term>(f) );
    }
}

class PairList extends List<Pair> {
    get tail () : PairList | Nil {
        if (this.length == 1) return new Nil();
        return new PairList(this.items, this.offset + 1);
    }

    map (f : (i : Pair) => Pair) : PairList {
        return new PairList( this.mapItems<Pair>(f) );
    }
}

// -----------------------------------------------------------------------------

class Lambda extends Term {
    public params : Cons;
    public body   : Term;

    constructor (params : Cons, body : Term) {
        super();
        this.params = params;
        this.body   = body;
    }

    override toNativeStr () : string {
        return `(λ ${this.params.toNativeStr()} ${this.body.toNativeStr()})`
    }
}

// -----------------------------------------------------------------------------

type NativeFunc  = (params : Term[], env : Environment) => Term;
type NativeFExpr = (params : Term[], env : Environment) => Term;

abstract class Applicative extends Term {}
abstract class Operative   extends Term {}

class Closure extends Applicative {
    public lambda : Lambda;
    public env    : Environment;

    constructor (lambda : Lambda, env : Environment) {
        super();
        this.lambda = lambda;
        this.env    = env;
    }

    override toNativeStr () : string {
        return `< ${this.lambda.toNativeStr()} ${this.env.toNativeStr()} >`
    }
}

class Native extends Applicative {
    public name : string;
    public body : NativeFunc;

    constructor (name : string, body : NativeFunc) {
        super();
        this.name = name;
        this.body = body;
    }

    override toNativeStr () : string {
        return `n:❮${this.name}❯`
    }
}

class FExpr extends Operative {
    public name : string;
    public body : NativeFExpr;

    constructor (name : string, body : NativeFExpr) {
        super();
        this.name = name;
        this.body = body;
    }

    override toNativeStr () : string {
        return `f:❮${this.name}❯`
    }
}

// -----------------------------------------------------------------------------

type Scope = (n : Sym) => Term;

class Environment extends Term {
    public scope : Scope;
    public view  : string;

    constructor (scope : Scope, view : string = '') {
        super();
        this.scope = scope;
        this.view  = view;
    }

    lookup (sym : Sym) : Term {
        return this.scope(sym);
    }

    define (name : Sym, value : Term) : void {
        let upper = this.scope;
        this.view += `${name.toNativeStr()} : ${value.toNativeStr()} ~ `;
        console.log(`∈ ~ view // ${this.view}`);
        this.scope = (query : Sym) : Term => {
            console.log(`∈ ~ query // ${name.toNativeStr()} ?= ${query.toNativeStr()}`);
            if (query.ident == name.ident) return value;
            return upper(query);
        };
    }

    derive () : Environment {
        return new Environment( this.scope, this.view );
    }

    override toNativeStr () : string {
        return `∈[${this.view}]`
    }
}

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

type ParseExpr = Term | ParseExpr[];

function parse (source : string) : Term[] {
    const SPLITTER = /\(|\)|'|"(?:[^"\\]|\\.)*"|[^\s\(\)';]+/g;

    const tokenize = (src : string) : string[] => src.match(SPLITTER) ?? [];

    const parseTokens = (tokens : string[]) : [ ParseExpr, string[] ] => {
        let token = tokens[0];
        if (token == undefined) throw new Error('Undefined Token');
        let rest = tokens.slice(1);
        if (token == '(') return parseList( rest, [] );
        switch (true) {
        case token == 'true'        : return [ new Bool(true),         rest ];
        case token == 'false'       : return [ new Bool(false),        rest ];
        case !isNaN(Number(token))  : return [ new Num(Number(token)), rest ];
        case token.charAt(0) == '"' : return [ new Str(token.slice(1, token.length - 1)), rest ];
        default                     : return [ new Sym(token),         rest ];
        }
    }

    const parseList = (tokens : string[], acc : ParseExpr[]) : [ ParseExpr[], string[] ] => {
        if (tokens[0] === ')') return [ acc, tokens.slice(1) ];
        let [ expr, remaining ] = parseTokens( tokens );
        return parseList( remaining, [ ...acc, expr ] );
    }

    let exprs  = [];
    let tokens = tokenize( source );
    let rest   = tokens;
    while (rest.length > 0) {
        let [ expr, remaining ] = parseTokens( rest );
        exprs.push(expr as Term);
        rest = remaining;
    }
    return exprs;
}

function compile (expr : Term[]) : Term[] {

    const compileExpression = (expr : ParseExpr) : Term => {
        if (!Array.isArray(expr)) return expr;

        if (expr.length == 0) return new Cons([]);

        let rest = expr.map((e) => compileExpression(e));

        // handle pairs and bindings
        if (rest.length == 3) {
            let [ fst, sym, snd ] = rest;
            if (sym instanceof Sym) {
                switch(sym.ident) {
                case ':' : return new Pair( fst, snd );
                default:
                    // let it fall through
                }
            }
        }

        if (rest[0] instanceof Sym) {
            switch (rest[0].ident) {
            case 'lambda':
                let params = rest[1];
                let body   = rest[2];
                if (!(params instanceof Cons))
                    throw new Error(`Lambda params must be a Cons not ${params.constructor}`);
                return new Lambda( params, compileExpression( body ) );
            default:
                // let it fall through
            }
        }

        // handle different list types ...
        if (rest.every((p) => p instanceof Pair)) {
            return new PairList( rest );
        }
        else {
            return new Cons( rest );
        }
    }

    return expr.map(compileExpression);
}


// -----------------------------------------------------------------------------

const liftNumBinOp = (f : (n : number, m : number) => number) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Num)) throw new Error(`LHS must be a Num, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Num)) throw new Error(`RHS must be a Num, not ${rhs.constructor.name}`);
        return new Num( f(lhs.value, rhs.value) );
    }
}

const liftStrBinOp = (f : (n : string, m : string) => string) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Str)) throw new Error(`LHS must be a Str, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Str)) throw new Error(`RHS must be a Str, not ${rhs.constructor.name}`);
        return new Str( f(lhs.value, rhs.value) );
    }
}

const liftNumCompareOp = (f : (n : number, m : number) => boolean) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Num)) throw new Error(`LHS must be a Num, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Num)) throw new Error(`RHS must be a Num, not ${rhs.constructor.name}`);
        return new Bool( f(lhs.value, rhs.value) );
    }
}

const liftStrCompareOp = (f : (n : string, m : string) => boolean) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Str)) throw new Error(`LHS must be a Str, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Str)) throw new Error(`RHS must be a Str, not ${rhs.constructor.name}`);
        return new Bool( f(lhs.value, rhs.value) );
    }
}

// -----------------------------------------------------------------------------

let env = new Environment((query : Sym) : Term => {
    console.log(`query // ${query.toNativeStr()} isa builtin?`);
    switch (query.ident) {
    case '+'  : return new Native('+',    liftNumBinOp((n, m) => n + m));
    case '-'  : return new Native('-',    liftNumBinOp((n, m) => n - m));
    case '*'  : return new Native('*',    liftNumBinOp((n, m) => n * m));
    case '/'  : return new Native('/',    liftNumBinOp((n, m) => n / m));
    case '%'  : return new Native('%',    liftNumBinOp((n, m) => n % m));
    case '>=' : return new Native('>=',   liftNumCompareOp((n, m) => n >= m));
    case '>'  : return new Native('>',    liftNumCompareOp((n, m) => n >  m));
    case '<=' : return new Native('<=',   liftNumCompareOp((n, m) => n <= m));
    case '<'  : return new Native('<',    liftNumCompareOp((n, m) => n <  m));
    case '==' : return new Native('==',   liftNumCompareOp((n, m) => n == m));
    case '!=' : return new Native('!=',   liftNumCompareOp((n, m) => n != m));
    case '~'  : return new Native('~',    liftStrBinOp((n, m) => n + m));
    case 'ge' : return new Native('ge',   liftStrCompareOp((n, m) => n >= m));
    case 'gt' : return new Native('gt',   liftStrCompareOp((n, m) => n >  m));
    case 'le' : return new Native('le',   liftStrCompareOp((n, m) => n <= m));
    case 'lt' : return new Native('lt',   liftStrCompareOp((n, m) => n <  m));
    case 'eq' : return new Native('eq',   liftStrCompareOp((n, m) => n == m));
    case 'ne' : return new Native('ne',   liftStrCompareOp((n, m) => n != m));

    case 'list' :
        return new Native('list', (args, env) => new Cons(args));

    default:
        throw new Error(`Unable to find ${query.ident} in Scope`);
    }
});

// -----------------------------------------------------------------------------

/*
Eval answers:
    "What does this expression mean in this environment?"
Apply answers:
    "What happens when I invoke this procedure with these arguments?"
*/

class Kontinue {
    public stack : Term[] = [];

    toString () : string {
        if (this.stack.length == 0) return '';
        return ` ^(${this.stack.map((t) => t.toNativeStr()).join(';')})`
    }
}

class Halt extends Kontinue {
    override toString () : string {
        return `HALT!`+super.toString()
    }
}

class Check extends Kontinue {
    constructor(public args  : Term) { super() }
    override toString () : string {
        return `Check[${this.args.toNativeStr()}]`+super.toString()
    }
}

class Just extends Kontinue {
    constructor(public value : Term) { super() }
    override toString () : string {
        return `Just[${this.value.toNativeStr()}]`+super.toString()
    }
}

class Return extends Kontinue {
    constructor(public value : Term) { super() }
    override toString () : string {
        return `Return[${this.value.toNativeStr()}]`+super.toString()
    }
}

class MakePair extends Kontinue {
    override toString () : string {
        return `MakePair`+super.toString()
    }
}

class MakeCons extends Kontinue {
    override toString () : string {
        return `MakeCons`+super.toString()
    }
}

class Eval extends Kontinue {}

class EvalExpr extends Eval {
    constructor(public expr : Term) { super() }
    override toString () : string {
        return `EvalExpr[${this.expr.toNativeStr()}]`+super.toString()
    }
}

class EvalPair  extends Eval {
    constructor(public pair  : Pair) { super() }
    override toString () : string {
        return `EvalPair[${this.pair.toNativeStr()}]`+super.toString()
    }
}

class EvalPairFirst  extends Eval {
    constructor(public first  : Term) { super() }
    override toString () : string {
        return `EvalPairFirst[${this.first.toNativeStr()}]`+super.toString()
    }
}

class EvalPairSecond extends Eval {
    constructor(public second : Term) { super() }
    override toString () : string {
        return `EvalPairSecond[${this.second.toNativeStr()}]`+super.toString()
    }
}

class EvalCons  extends Eval {
    constructor(public cons  : Cons) { super() }
    override toString () : string {
        return `EvalCons[${this.cons.toNativeStr()}]`+super.toString()
    }
}

class EvalConsHead   extends Eval {
    constructor(public head   : Term) { super() }
    override toString () : string {
        return `EvalConsHead[${this.head.toNativeStr()}]`+super.toString()
    }
}

class EvalConsTail   extends Eval {
    constructor(public tail   : Term) { super() }
    override toString () : string {
        return `EvalConsTail[${this.tail.toNativeStr()}]`+super.toString()
    }
}


class Apply extends Kontinue {}

class ApplyOperative extends Apply {
    constructor(
        public call : Operative,
        public args : Term,
    ) { super() }

    override toString () : string {
        return `ApplyOperative[${this.call.toNativeStr()} ${this.args.toNativeStr()}]`+super.toString()
    }
}

class ApplyApplicative extends Apply {
    constructor(public call : Applicative) { super() }

    override toString () : string {
        return `ApplyApplicative[${this.call.toNativeStr()}]`+super.toString()
    }
}


function step (expr : Term, env : Environment) : any {

    const evaluateTerm = (expr : Term, env : Environment) : Kontinue => {
        console.log('@@ EVALUATE','@'.repeat(68));
        console.log(`%ENV ${env.toNativeStr()}`);
        console.log(`EXPR ${expr.toNativeStr()}`);
        console.log('.'.repeat(80));
        switch (expr.constructor) {
        case Nil    :
        case Num    :
        case Str    :
        case Bool   :
        case Native :
        case FExpr  : return new Just(expr);
        case Sym    : return new Just(env.lookup( expr as Sym ));
        case Lambda : return new Just(new Closure( expr as Lambda, env.derive() ));
        case Pair   : return new EvalPair( expr as Pair );
        case Cons   : return new EvalCons( expr as Cons );
        default:
            throw new Error(`Unrecognized Expression ${expr.constructor.name}`);
        }
    }

    const returnValues = (kont : Kontinue[], ...values : Term[]) : void => {
        if (kont.length == 0)
            throw new Error(`Cannot return value ${values.map((v) => v.toNativeStr()).join(', ')} without continuation`);
        let top = (kont.at(-1) as Kontinue);
        top.stack.push( ...values );
    }

    let kont = [
        new Halt(),
        new EvalExpr(expr),
    ];

    console.log('^^ STEP','^'.repeat(72));
    console.log(`%ENV ${env.toNativeStr()}`);
    console.log(`KONT\n `, kont.map((k) => k.toString()).join("\n  "));
    console.log('='.repeat(80));

    while (kont.length > 0) {
        let k = kont.pop() as Kontinue;
        console.log('TICK','='.repeat(75));
        console.log(`   K =>> `, k.toString());
        console.log('-'.repeat(80));
        console.group('..!');
        switch (k.constructor) {
        // ---------------------------------------------------------------------
        case Halt:
            return [ ...k.stack ];
        // ---------------------------------------------------------------------
        case Just:
            returnValues( kont, (k as Just).value );
            break;
        case Return:
            returnValues( kont, (k as Return).value );
            break;
        // ---------------------------------------------------------------------
        case EvalExpr:
            kont.push( evaluateTerm( (k as EvalExpr).expr, env ) );
            break;
        // ---------------------------------------------------------------------
        case EvalPair:
            let pair  = (k as EvalPair).pair;
            kont.push(
                new EvalPairSecond( pair.second ),
                evaluateTerm( pair.first, env ),
            );
            break;
        case EvalPairSecond:
            let second = evaluateTerm( (k as EvalPairSecond).second, env );
            let efirst = k.stack.pop() as Term;
            let mkPair = new MakePair();
            mkPair.stack.push(efirst);
            kont.push( mkPair, second );
            break;
        case MakePair:
            let snd = k.stack.pop();
            let fst = k.stack.pop();
            if (fst == undefined) throw new Error('Expected fst on stack');
            if (snd == undefined) throw new Error('Expected snd on stack');
            kont.push(new Return(new Pair( fst as Term, snd as Term )));
            break;
        // ---------------------------------------------------------------------
        case EvalCons:
            let cons  = (k as EvalCons).cons;
            let check = new Check( cons.tail );
            kont.push( check, evaluateTerm( cons.head, env ) );
            break;
        case EvalConsTail:
            let tail = (k as EvalConsTail).tail;
            if (tail instanceof Nil) {
                console.log("*************** GOT NIL ************************");
                break;
            }

            if (!((tail as Cons).tail instanceof Nil)) {
                kont.push( new EvalConsTail( (tail as Cons).tail ) );
            }

            let evaled = k.stack.pop();
            if (evaled != undefined) {
                returnValues( kont, evaled );
            }

            kont.push( evaluateTerm( (tail as Cons).head, env ) );
            break;
        // ---------------------------------------------------------------------
        case Check:
            let call = k.stack.pop();
            if (call == undefined) throw new Error('Expected call on stack');
            if (call instanceof Operative) {
                kont.push(new ApplyOperative( (call as FExpr), (k as Check).args ));
            }
            else if (call instanceof Applicative) {
                kont.push(
                    new ApplyApplicative( (call as Closure) ),
                    new EvalConsTail( (k as Check).args )
                );
            }
            else {
                throw new Error(`What to do with call -> ${call.constructor.name}??`);
            }
            break;
        // ---------------------------------------------------------------------
        case ApplyOperative:
            throw new Error('OPERATIVE!');
        case ApplyApplicative:
            switch ((k as ApplyApplicative).call.constructor) {
            case Native:
                kont.push(new Return(
                    ((k as ApplyApplicative).call as Native)
                        .body(k.stack, env)
                ));
                break;
            case Closure:
                throw new Error('TODO!');
            }
            break;
        default:
            throw new Error(`Unknown APPLY op ${JSON.stringify(k)}`);
        }
        console.groupEnd();
        console.log('/'.repeat(80));
        console.log(`KONT\n `, kont.map((k) => k.toString()).join("\n  "));
        console.log('='.repeat(80));
    }

    return true;
}

let program = compile(
    parse(`
        ( "foo" : (+ (/ 20 2) (* 4 5)))
    `)
);

console.log(program.map((e) => e.toNativeStr()).join("\n"));

let result = step(program[0] as Term, env);
console.log("RESULT", result);
console.log("RESULT", (result[0] as Term).toNativeStr());



/*

type Kontinuation =
    | { mode : 'EVAL',  op : 'JUST',        value  : Term }
    | { mode : 'EVAL',  op : 'RETURN',      value  : Term }
    | { mode : 'EVAL',  op : 'PAIR/first',  first  : Term }
    | { mode : 'EVAL',  op : 'PAIR/second', second : Term }
    | { mode : 'EVAL',  op : 'PAIR/build' }
    | { mode : 'EVAL',  op : 'CONS/head',   head   : Term }
    | { mode : 'EVAL',  op : 'CONS/tail',   tail   : Term }
    | { mode : 'EVAL',  op : 'CONS/apply',  args   : Term }
    | { mode : 'APPLY', op : 'OPERATIVE',   call : Operative, args : Term }
    | { mode : 'APPLY', op : 'APPLICATIVE', call : Applicative }

*/

/*

function evaluate (exprs : Term[], env : Environment) : Term[] {

    const evaluateExpr = (expr : Term, env : Environment) : Term => {
        console.log('='.repeat(80));
        console.log(`%ENV ${env.toNativeStr()}`);
        console.log(`EVAL ${expr.toNativeStr()}`);
        console.log('-'.repeat(80));
        switch (expr.constructor) {
        case Nil    :
        case Num    :
        case Str    :
        case Bool   :
        case Native :
        case FExpr  : return expr;
        case Sym    :
            console.group(`... lookup ${expr.toNativeStr()}`);
            let result = env.lookup( expr as Sym );
            console.groupEnd();
            console.log(`<<< got ${result.toNativeStr()}`);
            return result;
        case Lambda : return new Closure( expr as Lambda, env.derive() );
        case Pair   :
            console.group(`... evaluate Pair ${expr.toNativeStr()}`);
            let pair = new Pair(
                evaluateExpr( (expr as Pair).first,  env ),
                evaluateExpr( (expr as Pair).second, env ),
            );
            console.groupEnd();
            console.log(`<<< got ${pair.toNativeStr()}`);
            return pair;
        case Cons   :
            let call = evaluateExpr( (expr as Cons).head, env );
            let tail = (expr as Cons).tail;

            // -----------------------------------------------------------------
            // Operative
            // -----------------------------------------------------------------

            if (call instanceof FExpr) {
                let args = tail instanceof Nil ? [] : tail.toNativeArray();
                return (call as FExpr).body( args, env );
            }

            // -----------------------------------------------------------------
            // Applicative
            // -----------------------------------------------------------------

            console.group(`EVAL args ... ${tail.toNativeStr()}`);
            let args = tail instanceof Nil ? [] : (tail as Cons).mapItems<Term>((e) => evaluateExpr(e, env));
            console.groupEnd();

            //console.log("CALL", call);

            switch (call.constructor) {
            case Native  : return (call as Native).body(args, env);
            case Closure :
                let lambda = (call as Closure).lambda;
                let local  = (call as Closure).env.derive();
                for (let i = 0; i < args.length; i++) {
                    local.define( lambda.params.at(i) as Sym, args[i] );
                }
                return evaluateExpr( lambda.body, local );
            default:
                throw new Error(`Must be Native or Closure, not ${call.constructor.name}`);
            }

            // -----------------------------------------------------------------
        default:
            throw new Error(`Unrecognized Expression ${expr.constructor.name}`);
        }
    }

    let results = exprs.map((e) => evaluateExpr(e, env));

    return results;
}



let env = new Environment((query : Sym) : Term => {
    console.log(`query // ${query.toNativeStr()} isa builtin?`);
    switch (query.ident) {
    case '+'  : return new Native('+',    liftNumBinOp((n, m) => n + m));
    case '-'  : return new Native('-',    liftNumBinOp((n, m) => n - m));
    case '*'  : return new Native('*',    liftNumBinOp((n, m) => n * m));
    case '/'  : return new Native('/',    liftNumBinOp((n, m) => n / m));
    case '%'  : return new Native('%',    liftNumBinOp((n, m) => n % m));
    case '>=' : return new Native('>=',   liftNumCompareOp((n, m) => n >= m));
    case '>'  : return new Native('>',    liftNumCompareOp((n, m) => n >  m));
    case '<=' : return new Native('<=',   liftNumCompareOp((n, m) => n <= m));
    case '<'  : return new Native('<',    liftNumCompareOp((n, m) => n <  m));
    case '==' : return new Native('==',   liftNumCompareOp((n, m) => n == m));
    case '!=' : return new Native('!=',   liftNumCompareOp((n, m) => n != m));
    case '~'  : return new Native('~',    liftStrBinOp((n, m) => n + m));
    case 'ge' : return new Native('ge',   liftStrCompareOp((n, m) => n >= m));
    case 'gt' : return new Native('gt',   liftStrCompareOp((n, m) => n >  m));
    case 'le' : return new Native('le',   liftStrCompareOp((n, m) => n <= m));
    case 'lt' : return new Native('lt',   liftStrCompareOp((n, m) => n <  m));
    case 'eq' : return new Native('eq',   liftStrCompareOp((n, m) => n == m));
    case 'ne' : return new Native('ne',   liftStrCompareOp((n, m) => n != m));

    case 'list' :
        return new Native('list', (args, env) => new Cons(args));

    case 'def' :
        return new FExpr('def', (args, env) => {
            let [ name, value ] = args;
            let [ evaled ] = evaluate([ value ], env );
            env.define( name as Sym, evaled );
            return new Nil();
        });

    default:
        throw new Error(`Unable to find ${query.ident} in Scope`);
    }
});


let program = compile(
    parse(`
        (def add (lambda (x y) (+ x y)))

        (def adder
            (lambda (x)
                (lambda (y) (+ x y)) )
        )

        ((adder 10) 20)

    `)
);

console.log(program.map((e) => e.toNativeStr()).join("\n"));

let results = evaluate(program, env);
console.log(results);
console.log(results.map((e) => e.toNativeStr()).join("\n"));


*/

