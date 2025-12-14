
// -----------------------------------------------------------------------------
// Terms
// -----------------------------------------------------------------------------

abstract class Term {
    abstract toNativeStr () : string;

    toStr () : Str { return new Str(this.toNativeStr()) }
}

class Nil extends Term {
    toNativeStr () : string { return 'nil' }
}

class Bool extends Term {
    public value : boolean;

    constructor (value : boolean) {
        super();
        this.value = value;
    }

    toNativeStr () : string { return this.value ? 'true' : 'false' }
}

class Num  extends Term {
    public value : number;

    constructor (value : number) {
        super();
        this.value = value;
    }

    toNativeStr () : string { return this.value.toString() }
}

class Str  extends Term {
    public value : string;

    constructor (value : string) {
        super();
        this.value = value;
    }

    toNativeStr () : string { return this.value }
}

class Sym  extends Term {
    public ident : string;

    constructor (ident : string) {
        super();
        this.ident = ident;
    }

    toNativeStr () : string { return '`'+this.ident }
}

class Pair extends Term {
    public first  : Term;
    public second : Term;

    constructor (fst : Term, snd : Term) {
        super();
        this.first  = fst;
        this.second = snd;
    }

    toNativeStr () : string {
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

    toNativeStr () : string {
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

class Binding extends Pair {
    public first : Sym;

    constructor (sym : Sym, value : Term) {
        super(sym, value);
    }

    toNativeStr () : string {
        return `(${this.first.toNativeStr()} : ${this.second.toNativeStr()})`
    }
}

class Lambda extends Term {
    public params : Cons;
    public body   : Cons;

    constructor (params : Cons, body : Cons) {
        super();
        this.params = params;
        this.body   = body;
    }

    toNativeStr () : string {
        return `(& ${this.params.toNativeStr()} ${this.body.toNativeStr()})`
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

    // TODO - capture closed over vars for toNativeStr

    toNativeStr () : string {
        return `(@ ${this.lambda.toNativeStr()} %())`
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

    toNativeStr () : string {
        return `(* ${this.name})`
    }
}

interface Builtins {
    [name : string] : Native;
}

class Environment extends List<Binding> {
    public builtins : Builtins;

    constructor (items : Binding[], builtins : Builtins, offset : number = 0) {
        super(items, offset);
        this.builtins = builtins;
    }

    get tail () : Environment | Nil {
        if (this.length == 1) return new Nil();
        return new Environment(this.items, this.builtins, this.offset + 1);
    }

    map (f : (i : Binding) => Binding) : Environment {
        return new Environment( this.mapItems<Binding>(f), this.builtins );
    }

    lookup (sym : Sym) : Term {
        if (this.builtins.hasOwnProperty(sym.ident)) {
            return this.builtins[sym.ident];
        }

        for (let i = 0; i < this.length; i++) {
            let binding = this.at(i);
            if (binding.first.ident == sym.ident) {
                return binding.second;
            }
        }
        return new Nil();
    }

    derive (bindings : Binding[]) {
        return new Environment(
            [
                ...bindings,
                ...this.items.slice(this.offset),
            ],
            this.builtins,
            this.offset,
        )
    }
}

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

type ParseExpr = Term | ParseExpr[];

function parse (source : string) : ParseExpr {
    const SPLITTER = /'(?:[^'\\]|\\.)*'|[()]|[^\s()']+/g

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
        case token.charAt(0) == '"' : return [ new Str(token),         rest ];
        default                     : return [ new Sym(token),         rest ];
        }
    }

    const parseList = (tokens : string[], acc : ParseExpr[]) : [ ParseExpr[], string[] ] => {
        if (tokens[0] === ')') return [ acc, tokens.slice(1) ];
        let [ expr, remaining ] = parseTokens( tokens );
        return parseList( remaining, [ ...acc, expr ] );
    }

    let [ expr, rest ] = parseTokens( tokenize( source ) );
    return expr;
}

function compile (expr : ParseExpr, builtins : Builtins) : Term {
    if (!Array.isArray(expr)) return expr;

    if (expr.length == 0) return new Cons([]);

    let rest = expr.map((e) => compile(e, builtins));

    // handle pairs and bindings
    if (rest.length == 3) {
        let [ fst, sym, snd ] = rest;
        if (sym instanceof Sym) {
            switch(sym.ident) {
            case '.' : return new Pair( fst, snd );
            case ':' :
                if (!(fst instanceof Sym)) throw new Error(`Bindings must start with Sym not ${fst.constructor}`);
                return new Binding( fst, snd );
            default:
                // let it fall through
            }
        }
    }

    // handle special forms
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
    if (rest.every((p) => p instanceof Binding)) {
        return new Environment( rest, builtins );
    }
    else if (rest.every((p) => p instanceof Pair)) {
        return new PairList( rest );
    }
    else {
        return new Cons( rest );
    }
}


// -----------------------------------------------------------------------------

const liftNumBinOp = (f : (n : number, m : number) => number) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Num)) throw new Error(`LHS must be a Num, not ${lhs.constructor}`);
        if (!(rhs instanceof Num)) throw new Error(`RHS must be a Num, not ${rhs.constructor}`);
        return new Num( f(lhs.value, rhs.value) );
    }
}

const liftNumCompareOp = (f : (n : number, m : number) => boolean) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Num)) throw new Error(`LHS must be a Num, not ${lhs.constructor}`);
        if (!(rhs instanceof Num)) throw new Error(`RHS must be a Num, not ${rhs.constructor}`);
        return new Bool( f(lhs.value, rhs.value) );
    }
}


let env = compile(
    parse(`(
        (add  : (lambda (x y) (+ x y)))
        (main :

            (add 10 20)

        )
    )`),
    {
        '+'  : new Native('+',  liftNumBinOp((n, m) => n + m)),
        '-'  : new Native('-',  liftNumBinOp((n, m) => n - m)),
        '*'  : new Native('*',  liftNumBinOp((n, m) => n * m)),
        '/'  : new Native('/',  liftNumBinOp((n, m) => n / m)),
        '%'  : new Native('%',  liftNumBinOp((n, m) => n % m)),

        '>=' : new Native('>=', liftNumCompareOp((n, m) => n >= m)),
        '>'  : new Native('>',  liftNumCompareOp((n, m) => n >  m)),
        '<=' : new Native('<=', liftNumCompareOp((n, m) => n <= m)),
        '<'  : new Native('<',  liftNumCompareOp((n, m) => n <  m)),
        '==' : new Native('==', liftNumCompareOp((n, m) => n == m)),
        '!=' : new Native('!=', liftNumCompareOp((n, m) => n != m)),
    }
) as Environment;

let program = env.map((b) => {
    if (b.second instanceof Lambda) {
        return new Binding( b.first, new Closure( b.second as Lambda, env ) );
    }
    return b;
});

console.log(program.toNativeStr());

function evaluate (expr : Term, env : Environment) : Term {
    switch (expr.constructor) {
    case Nil    :
    case Num    :
    case Str    :
    case Bool   :
    case Pair   :
    case Native : return expr;
    case Sym    : return env.lookup( expr as Sym );
    case Lambda : return new Closure( expr as Lambda, env );
    case Cons   :
        let [ call, ...args ] = (expr as Cons).mapItems<Term>((e) => evaluate(e, env));
        switch (call.constructor) {
        case Native  : return (call as Native).body(args, env);
        case Closure :
            let local  = (call as Closure).env;
            let lambda = (call as Closure).lambda;
            let bindings = [];
            for (let i = 0; i < args.length; i++) {
                bindings[i] = new Binding( lambda.params.at(i) as Sym, args[i] );
            }
            return evaluate( lambda.body, local.derive(bindings) );
        default:
            throw new Error(`Must be Native or Closure, not ${call.constructor}`);
        }
    }
}

let result = evaluate(program.lookup(new Sym('main')), program);
console.log(result);
console.log(result.toNativeStr());














