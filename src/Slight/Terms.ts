
import type { Environment } from './Environment'
import type { Kontinue    } from './Kontinue'

export type Term =
    | Bool
    | Num
    | Str
    | Sym
    | Nil
    | Cons
    | Lambda
    | Native
    | FExpr
    | Exception

export abstract class AbstractTerm {
    abstract readonly kind: string;

    abstract toNativeStr  () : string;

    toNativeBool () : boolean { return true }

    toStr  () : Str  { return new Str(this.toNativeStr()) }
    toBool () : Bool { return new Bool(this.toNativeBool()) }

    pprint () : string { return this.toNativeStr() }
}

// -----------------------------------------------------------------------------

export class Exception extends AbstractTerm {
    readonly kind = 'Exception' as const;

    public msg : string;

    constructor (msg : string) {
        super();
        this.msg = msg;
    }

    override toNativeStr  () : string { return `Exception ${this.msg}` }
}

// -----------------------------------------------------------------------------

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

export abstract class Literal extends AbstractTerm {}

export class Bool extends Literal {
    readonly kind = 'Bool' as const;

    public value : boolean;

    constructor (value : boolean) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return this.value ? 'true' : 'false' }
    override toNativeBool () : boolean { return this.value }
}

export class Num extends Literal {
    readonly kind = 'Num' as const;

    public value : number;

    constructor (value : number) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return this.value.toString() }
    override toNativeBool () : boolean { return this.value == 0 ? false : true }
}

export class Str extends Literal {
    readonly kind = 'Str' as const;

    public value : string;

    constructor (value : string) {
        super();
        this.value = value;
    }

    override pprint () : string { return `"${this.value}"` }

    override toNativeStr () : string { return this.value }
    override toNativeBool () : boolean { return this.value.length == 0 ? false : true }
}

// -----------------------------------------------------------------------------

export abstract class List extends AbstractTerm {}

export class Nil extends List {
    readonly kind = 'Nil' as const;

    override toNativeStr () : string { return '()' }
    override toNativeBool () : boolean { return false }
}

export class Cons extends List {
    readonly kind = 'Cons' as const;

    public items  : Term[];
    public offset : number;

    constructor (items : Term[], offset : number = 0) {
        super();
        this.items  = items;
        this.offset = offset;
    }

    at (i : number) : Term {
        if ((this.offset + i) > this.items.length) throw new Error(`Index(${i}) out of range`);
        return this.items[ this.offset + i ];
    }

    get length () : number { return this.items.length - this.offset }
    get first  () : Term   { return this.items[this.offset] }

    get rest () : Cons | Nil {
        if (this.length == 1) return new Nil();
        return new Cons(this.items, this.offset + 1);
    }

    toNativeArray () : Term[] {
        let list = [];
        for (let i = 0; i < this.length; i++) {
            list.push( this.at(i) );
        }
        return list;
    }

    override toNativeStr () : string {
        return `(${ this.items.slice(this.offset, this.items.length).map((i) => i.pprint()).join(' ') })`
    }

    override toNativeBool () : boolean { return this.length == 0 ? false : true }
}

// -----------------------------------------------------------------------------

export type NativeFunc  = (params : Term[], env : Environment) => Term;
export type NativeFExpr = (params : Term[], env : Environment) => Kontinue[];

export abstract class Callable extends AbstractTerm {}

export abstract class Applicative extends Callable {}
export abstract class Operative   extends Callable {}

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
        return `Native(${this.name})`
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
        return `FExpr[ ${this.name} ]`
    }
}
