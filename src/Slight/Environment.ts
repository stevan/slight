
import { LOG, YELLOW } from './Logger'

import { Term, Sym } from './Terms'

type Scope = (n : Sym) => Term;

export class Environment extends Term {
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
        LOG(YELLOW, ` ~ define(${name.toNativeStr()}) => ${this.view || '~{}'}`);
        this.view += `${name.toNativeStr()} : ${value.toNativeStr()}, `;
        this.scope = (query : Sym) : Term => {
            LOG(YELLOW, ` ~ lookup // ${query.toNativeStr()} in scope(${name.toNativeStr()})`);
            if (query.ident == name.ident) return value;
            return upper(query);
        };
    }

    capture () : Environment {
        // XXX - consider passing in the lambda
        // and looking for free variables that
        // need capturing, not sure if it actually
        // matters, but we could do it.
        return new Environment( this.scope, this.view );
    }

    derive (params : Sym[], args : Term[]) : Environment {
        if (params.length != args.length) throw new Error(`Not Enough args!`);

        // TODO - don't define() it all, but
        // create a custom param/bind Scope
        // function similar to how builtins
        // are handled.

        let local = new Environment( this.scope, this.view );
        for (let i = 0; i < params.length; i++) {
            local.define( params[i] as Sym, args[i] as Term );
        }

        return local;
    }

    override toNativeStr () : string {
        return `~{${this.view}}`
    }
}
