
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
    public body   : Cons;

    constructor (params : Cons, body : Cons) {
        super();
        this.params = params;
        this.body   = body;
    }

    override toNativeStr () : string {
        return `(λ ${this.params.toNativeStr()} ${this.body.toNativeStr()})`
    }
}

class Closure extends Term {
    public lambda : Lambda;
    public env    : Environment;

    constructor (lambda : Lambda, env : Environment) {
        super();
        this.lambda = lambda;
        this.env    = env;
    }

    override toNativeStr () : string {
        return `< ${this.lambda.toNativeStr()} @ ${this.env.toNativeStr()} >`
    }
}

type NativeFunc = (params : Term[], env : Environment) => Term;

class Native extends Term {
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

type NativeFExpr = (params : Term[], env : Environment) => Term;

class FExpr extends Term {
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
        this.view += `, { ${name.toNativeStr()} : ${value.toNativeStr()} }`;
        console.log(`Updating view: ${this.view}`);
        this.scope = (query : Sym) : Term => {
            console.log(`query // ${name.toNativeStr()} ?= ${query.toNativeStr()}`);
            if (query.ident == name.ident) return value;
            return upper(query);
        };
    }

    derive () : Environment {
        return new Environment( this.scope, this.view );
    }

    override toNativeStr () : string {
        return `∈ [ ${this.view} ]`
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
                if (!(params instanceof Cons)) throw new Error(`Lambda params must be a Cons not ${params.constructor}`);
                if (!(body   instanceof Cons)) throw new Error(`Lambda body must be a Cons not ${body.constructor}`);
                return new Lambda( params, body );
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

function evaluate (exprs : Term[], env : Environment) : Term[] {

    const evaluateExpr = (expr : Term, env : Environment) : Term => {
        console.log(`EVAL ${expr.toNativeStr()}`);
        switch (expr.constructor) {
        case Nil    :
        case Num    :
        case Str    :
        case Bool   :
        case Native :
        case FExpr  : return expr;
        case Sym    : return env.lookup( expr as Sym );
        case Lambda : return new Closure( expr as Lambda, env.derive() );
        case Pair   :
            return new Pair(
                evaluateExpr( (expr as Pair).first,  env ),
                evaluateExpr( (expr as Pair).second, env ),
            );
        case Cons   :
            let call = evaluateExpr( (expr as Cons).head, env );
            let tail = (expr as Cons).tail;

            if (call instanceof FExpr) {
                let args = tail instanceof Nil ? [] : tail.toNativeArray();
                return (call as FExpr).body( args, env );
            }

            console.group('EVAL args ...');
            let args = (tail as Cons).mapItems<Term>((e) => evaluateExpr(e, env));
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

        (add 10 20)

    `)
);

console.log(program.map((e) => e.toNativeStr()).join("\n"));

let results = evaluate(program, env);
console.log(results);
console.log(results.map((e) => e.toNativeStr()).join("\n"));





