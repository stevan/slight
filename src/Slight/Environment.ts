
import { LOG, YELLOW } from './Logger'

import { Term, Pair, PairList, Sym } from './Terms'

export type MaybeEnvironment = Environment | undefined

export class Environment extends Term {
    public bindings : Map<string, Term>;
    public parent   : MaybeEnvironment;

    constructor (bindings : Map<string, Term>, parent? : MaybeEnvironment) {
        super();
        this.bindings = bindings;
        this.parent   = parent;
    }

    lookup(sym: Sym): Term {
        if (this.bindings.has(sym.ident))
            return this.bindings.get(sym.ident)!;
        if (this.parent)
            return this.parent.lookup(sym);
        throw new Error(`Undefined: ${sym.ident}`);
    }

    define(name: Sym, value: Term): void {
        this.bindings.set(name.ident, value);
    }

    capture () : Environment {
        return new Environment( new Map<string, Term>(), this );
    }

    derive (params : Sym[], args : Term[]) : Environment {
        if (params.length != args.length) throw new Error(`Not Enough args!`);

        let local = new Environment( new Map<string, Term>(), this );
        for (let i = 0; i < params.length; i++) {
            local.define( params[i] as Sym, args[i] as Term );
        }

        return local;
    }

    // Reification
    toPairList(): PairList {
        let pairs = [...this.bindings.entries()]
              .map(([k, v]) => new Pair(new Sym(k), v));
        return new PairList(pairs);
    }

    override toNativeStr(): string {
        return `Env(${[...this.bindings.keys()].join(', ')})`;
    }
}
