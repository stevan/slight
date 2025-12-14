
// -----------------------------------------------------------------------------
// Terms
// -----------------------------------------------------------------------------

abstract class Term {
    abstract toNativeStr () : string;

    toStr () : Str { return new Str(this.toNativeStr()) }
}

class Nil extends Term {
    toNativeStr () : string { return '()' }
}

class Bool extends Term {
    public value : boolean;

    constructor(value : boolean) {
        super();
        this.value = value;
    }

    toNativeStr () : string { return this.value ? 'true' : 'false' }
}

class Num  extends Term {
    public value : number;

    constructor(value : number) {
        super();
        this.value = value;
    }

    toNativeStr () : string { return this.value.toString() }
}

class Str  extends Term {
    public value : string;

    constructor(value : string) {
        super();
        this.value = value;
    }

    toNativeStr () : string { return `"${this.value}"` }
}

class Sym  extends Term {
    public ident : string;

    constructor(ident : string) {
        super();
        this.ident = ident;
    }

    toNativeStr () : string { return '`'+this.ident }
}

class Pair extends Term {
    public first  : Term;
    public second : Term;

    constructor(fst : Term, snd : Term) {
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

    constructor(items : T[], offset : number = 0) {
        super();
        this.items  = items;
        this.offset = offset;
    }

    AT (i : number) : T | undefined {
        return this.items[ this.offset + i ];
    }

    MAP<U> (f : (i : T) => U) : U[] {
        let list = [];
        for (let i = 0; i < this.length; i++) {
            list.push( f( this.AT(i) ) );
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
        return new Cons( this.MAP<Term>(f) );
    }
}

class PairList extends List<Pair> {
    get tail () : PairList | Nil {
        if (this.length == 1) return new Nil();
        return new PairList(this.items, this.offset + 1);
    }

    map (f : (i : Pair) => Pair) : Cons {
        return new PairList( this.MAP<Pair>(f) );
    }
}

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

type ParseExpr = Term | ParseExpr[];

function parse (source : string) : Term {
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

    const buildTree = (expr : ParseExpr) : Term  => {
        if (!Array.isArray(expr)) return expr;
        if (expr.length == 3) {
            let [ fst, sym, snd ] = expr;
            if (sym instanceof Sym && sym.ident == '.') {
                return new Pair( buildTree(fst), buildTree(snd) );
            }
        }
        let body = expr.map(buildTree);
        if (body.every((p) => p instanceof Pair)) {
            return new PairList( body );
        } else {
            return new Cons( body );
        }
    }

    let [ expr, rest ] = parseTokens( tokenize( source ) );
    return buildTree( expr );
}

let ast = parse(`
    (1 2 (3 . 4) 5)
`);

console.log(ast.toNativeStr());
console.log(ast);

let ast2 = ((ast as Cons).tail as Cons).map((p) => new Num( (p as Num).value * 10 ) );

console.log(ast2.toNativeStr());
console.log(ast2);

console.log((ast2 as Cons).tail.toNativeStr());
console.log((ast2 as Cons).tail);














