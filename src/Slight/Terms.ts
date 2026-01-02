
import type { Environment } from './Environment'
import type { Kontinue    } from './Kontinue'

export type Term =
    | Nil
    | Bool
    | Num
    | Str
    | Sym
    | Pair
    | Cons
    | PairList
    | Lambda
    | Native
    | FExpr
    | Exception

export abstract class AbstractTerm {
    abstract readonly kind: string;

    abstract toNativeStr () : string;

    toStr () : Str { return new Str(this.toNativeStr()) }
}

// -----------------------------------------------------------------------------

export class Exception extends AbstractTerm {
    readonly kind = 'Exception' as const;

    public msg : string;

    constructor (msg : string) {
        super();
        this.msg = msg;
    }

    override toNativeStr () : string { return `Exception ${this.msg}` }
}

// -----------------------------------------------------------------------------

export class Nil extends AbstractTerm {
    readonly kind = 'Nil' as const;

    override toNativeStr () : string { return '()' }
}

export class Bool extends AbstractTerm {
    readonly kind = 'Bool' as const;

    public value : boolean;

    constructor (value : boolean) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return this.value ? 'true' : 'false' }
}

export class Num extends AbstractTerm {
    readonly kind = 'Num' as const;

    public value : number;

    constructor (value : number) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return this.value.toString() }
}

export class Str extends AbstractTerm {
    readonly kind = 'Str' as const;

    public value : string;

    constructor (value : string) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return `"${this.value}"` }
}

export class Sym extends AbstractTerm {
    readonly kind = 'Sym' as const;

    public ident : string;

    constructor (ident : string) {
        super();
        this.ident = ident;
    }

    override toNativeStr () : string { return this.ident }
}

// -----------------------------------------------------------------------------

export class Pair extends AbstractTerm {
    readonly kind = 'Pair' as const;

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

abstract class List<T extends Term> extends AbstractTerm {
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

export class Cons extends List<Term> {
    readonly kind = 'Cons' as const;

    get tail () : Cons | Nil {
        if (this.length == 1) return new Nil();
        return new Cons(this.items, this.offset + 1);
    }

    map (f : (i : Term) => Term) : Cons {
        return new Cons( this.mapItems<Term>(f) );
    }
}

export class PairList extends List<Pair> {
    readonly kind = 'PairList' as const;

    get tail () : PairList | Nil {
        if (this.length == 1) return new Nil();
        return new PairList(this.items, this.offset + 1);
    }

    map (f : (i : Pair) => Pair) : PairList {
        return new PairList( this.mapItems<Pair>(f) );
    }
}

// -----------------------------------------------------------------------------

export type NativeFunc  = (params : Term[], env : Environment) => Term;
export type NativeFExpr = (params : Term[], env : Environment) => Kontinue[];

export abstract class Applicative extends AbstractTerm {}
export abstract class Operative   extends AbstractTerm {}

export class Lambda extends Applicative {
    readonly kind = 'Lambda' as const;

    public params : Cons;
    public body   : Term;
    public env    : Environment;

    constructor (params : Cons, body : Term, env : Environment) {
        super();
        this.params = params;
        this.body   = body;
        this.env    = env;
    }

    override toNativeStr () : string {
        return `(λ ${this.params.toNativeStr()} ${this.body.toNativeStr()} ${this.env.toNativeStr()})`
    }
}

export class Native extends Applicative {
    readonly kind = 'Native' as const;

    public name : string;
    public body : NativeFunc;

    constructor (name : string, body : NativeFunc) {
        super();
        this.name = name;
        this.body = body;
    }

    override toNativeStr () : string {
        return `n:(${this.name})`
    }
}

export class FExpr extends Operative {
    readonly kind = 'FExpr' as const;

    public name : string;
    public body : NativeFExpr;

    constructor (name : string, body : NativeFExpr) {
        super();
        this.name = name;
        this.body = body;
    }

    override toNativeStr () : string {
        return `f:(${this.name})`
    }
}
