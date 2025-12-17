
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

    capture () : Environment {
        return new Environment( this.scope, this.view );
    }

    derive (params : Sym[], args : Term[]) : Environment {
        if (params.length != args.length) throw new Error(`Not Enough args!`);

        let local = new Environment( this.scope, this.view );
        for (let i = 0; i < params.length; i++) {
            local.define( params[i] as Sym, args[i] as Term );
        }

        return local;
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
    public stack : Term[];
    public env   : Environment;

    constructor(env : Environment) {
        this.env   = env;
        this.stack = []
    }

    toString () : string {
        let envStr =  this.env.toNativeStr();
        if (this.stack.length == 0) return ` ${envStr}`;
        return ` ^(${this.stack.map((t) => t.toNativeStr()).join(';')}) ${envStr}`
    }
}

class Halt extends Kontinue {
    override toString () : string {
        return `HALT!`+super.toString()
    }
}

class Check extends Kontinue {
    constructor(public args  : Term, env : Environment) { super(env) }
    override toString () : string {
        return `Check[${this.args.toNativeStr()}]`+super.toString()
    }
}

class Just extends Kontinue {
    constructor(public value : Term, env : Environment) { super(env) }
    override toString () : string {
        return `Just[${this.value.toNativeStr()}]`+super.toString()
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
    constructor(public expr : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalExpr[${this.expr.toNativeStr()}]`+super.toString()
    }
}

class EvalPair  extends Eval {
    constructor(public pair : Pair, env : Environment) { super(env) }
    override toString () : string {
        return `EvalPair[${this.pair.toNativeStr()}]`+super.toString()
    }
}

class EvalPairFirst  extends Eval {
    constructor(public first : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalPairFirst[${this.first.toNativeStr()}]`+super.toString()
    }
}

class EvalPairSecond extends Eval {
    constructor(public second : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalPairSecond[${this.second.toNativeStr()}]`+super.toString()
    }
}

class EvalCons  extends Eval {
    constructor(public cons : Cons, env : Environment) { super(env) }
    override toString () : string {
        return `EvalCons[${this.cons.toNativeStr()}]`+super.toString()
    }
}

class EvalConsHead   extends Eval {
    constructor(public head : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalConsHead[${this.head.toNativeStr()}]`+super.toString()
    }
}

class EvalConsTail   extends Eval {
    constructor(public tail : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalConsTail[${this.tail.toNativeStr()}]`+super.toString()
    }
}


class Apply extends Kontinue {}

class ApplyOperative extends Apply {
    public call : Operative;
    public args : Term;

    constructor(call : Operative, args : Term, env : Environment) {
        super(env);
        this.call = call;
        this.args = args;
    }

    override toString () : string {
        return `ApplyOperative[${this.call.toNativeStr()} ${this.args.toNativeStr()}]`+super.toString()
    }
}

class ApplyApplicative extends Apply {
    constructor(public call : Applicative, env : Environment) { super(env) }

    override toString () : string {
        return `ApplyApplicative[${this.call.toNativeStr()}]`+super.toString()
    }
}


function run (program : Term[], rootEnv : Environment) : [ Term[][], Environment[] ] {

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
        case FExpr  : return new Just(expr, env);
        case Sym    : return new Just(env.lookup( expr as Sym ), env);
        case Lambda : return new Just(new Closure( expr as Lambda, env.capture() ), env);
        case Pair   : return new EvalPair( expr as Pair, env );
        case Cons   : return new EvalCons( expr as Cons, env );
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

    const step = (stepExpr : Term, stepEnv : Environment) : [ Term[], Environment ] => {
        let kont = [
            new Halt(stepEnv),
            new EvalExpr(stepExpr, stepEnv),
        ];

        console.log('^^ STEP','^'.repeat(72));
        console.log(`%ENV ${stepEnv.toNativeStr()}`);
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
                console.groupEnd();
                return [ k.stack, (k as Kontinue).env ];
            // ---------------------------------------------------------------------
            case Just:
                returnValues( kont, (k as Just).value );
                break;
            // ---------------------------------------------------------------------
            case EvalExpr:
                kont.push( evaluateTerm( (k as EvalExpr).expr, (k as Kontinue).env ) );
                break;
            // ---------------------------------------------------------------------
            case EvalPair:
                let pair  = (k as EvalPair).pair;
                kont.push(
                    new EvalPairSecond( pair.second, (k as Kontinue).env ),
                    evaluateTerm( pair.first, (k as Kontinue).env ),
                );
                break;
            case EvalPairSecond:
                let second = evaluateTerm( (k as EvalPairSecond).second, (k as Kontinue).env );
                let efirst = k.stack.pop() as Term;
                let mkPair = new MakePair( (k as Kontinue).env );
                mkPair.stack.push(efirst);
                kont.push( mkPair, second );
                break;
            case MakePair:
                let snd = k.stack.pop();
                let fst = k.stack.pop();
                if (fst == undefined) throw new Error('Expected fst on stack');
                if (snd == undefined) throw new Error('Expected snd on stack');
                kont.push( new Just( new Pair( fst as Term, snd as Term ), (k as Kontinue).env ) );
                break;
            // ---------------------------------------------------------------------
            case EvalCons:
                let cons  = (k as EvalCons).cons;
                let check = new Check( cons.tail, (k as Kontinue).env );
                kont.push( check, evaluateTerm( cons.head, (k as Kontinue).env ) );
                break;
            case EvalConsTail:
                let tail = (k as EvalConsTail).tail;
                if (tail instanceof Nil) {
                    console.log("*************** GOT NIL ************************");
                    break;
                }

                if (!((tail as Cons).tail instanceof Nil)) {
                    kont.push( new EvalConsTail( (tail as Cons).tail, (k as Kontinue).env ) );
                }

                let evaled = k.stack.pop();
                if (evaled != undefined) {
                    returnValues( kont, evaled );
                }

                kont.push( evaluateTerm( (tail as Cons).head, (k as Kontinue).env ) );
                break;
            // ---------------------------------------------------------------------
            case Check:
                let call = k.stack.pop();
                if (call == undefined) throw new Error('Expected call on stack');
                if (call instanceof Operative) {
                    kont.push(new ApplyOperative( (call as FExpr), (k as Check).args, (k as Kontinue).env ));
                }
                else if (call instanceof Applicative) {
                    kont.push(
                        new ApplyApplicative( (call as Closure), (k as Kontinue).env ),
                        new EvalConsTail( (k as Check).args, (k as Kontinue).env )
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
                    kont.push(new Just(
                        ((k as ApplyApplicative).call as Native).body( k.stack, (k as Kontinue).env ),
                        (k as Kontinue).env
                    ));
                    break;
                case Closure:
                    let closure = (k as ApplyApplicative).call as Closure;
                    let lambda  = closure.lambda;
                    let local   = closure.env;

                    let params  = lambda.params.toNativeArray();
                    let args    = k.stack;
                    kont.push( new EvalExpr( lambda.body, local.derive( params as Sym[], args ) ) );
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

        // should never happen
        return [ [ stepExpr ], stepEnv ];
    }


    let env     : Environment[] = [ rootEnv ];
    let results : Term[][]      = [];
    program.forEach((expr) => {
        let [ stack, local ] = step(expr, env.at(-1) as Environment);
        results.push(stack);
        env.push(local);
    });

    return [ results, env ];
}

let program = compile(
    parse(`
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
    `)
);

console.log(program.map((e) => e.toNativeStr()).join("\n"));

let result = run(program, env);
console.log("RESULT", result);

