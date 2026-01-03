
import { AbstractTerm, Term, Sym, Exception, Key } from './Terms'

export type MaybeEnvironment = Environment | undefined

export class Environment extends AbstractTerm {
    readonly kind = 'Environment' as const;

    public bindings : Map<string, Term>;
    public parent   : MaybeEnvironment;

    constructor (bindings : Map<string, Term>, parent? : MaybeEnvironment) {
        super();
        this.bindings = bindings;
        this.parent   = parent;
    }

    // only for internal use (for now, cause the API sucks)

    derive (params : Sym[], args : Term[]) : Environment {
        let local = this.capture();
        for (let i = 0; i < params.length; i++) {
            local.define( params[i] as Sym, args[i] as Term );
        }

        return local;
    }

    capture () : Environment {
        return new Environment( new Map<string, Term>(), this );
    }

    // -----------------------------------------------
    // external API uses Keys, internal API uses Syms
    // -----------------------------------------------

    depth () : number { return 1 + (this.parent?.depth() ?? 0) }

    lookup(sym: Sym | Key) : Term {
        if (this.bindings.has(sym.ident))
            return this.bindings.get(sym.ident)!;
        if (this.parent)
            return this.parent.lookup(sym);
        return new Exception(`Cannot find ${sym.pprint()} in Environment`);
    }

    exists (sym : Sym | Key) : boolean {
        if (this.bindings.has(sym.ident)) return true;
        if (this.parent) return this.parent.exists(sym);
        return false;
    }

    define(name: Sym | Key, value: Term): void {
        this.bindings.set(name.ident, value);
    }

    delete (sym : Sym | Key) : void {
        this.bindings.delete( sym.ident );
    }

    keys () : Key[] {
        return [ ...this.bindings.keys() ].map((t) => new Key(t));
    }

    // ...

    override toNativeStr(): string {
        return `Env[${this.depth()}](${[...this.bindings.keys()].join(', ')})`;
    }
}
