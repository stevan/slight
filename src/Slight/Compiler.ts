
import type { ParseExpr } from './Parser'

import * as C from './Terms';

export function compile (expr : ParseExpr[]) : C.Term[] {

    const compileExpression = (expr : ParseExpr) : C.Term => {
        if (!Array.isArray(expr)) {
            switch (true) {
            case expr == 'true'        : return new C.Bool(true)
            case expr == 'false'       : return new C.Bool(false)
            case !isNaN(Number(expr))  : return new C.Num(Number(expr))
            case expr.charAt(0) == '"' : return new C.Str(expr.slice(1, expr.length - 1))
            default                    : return new C.Sym(expr)
            }
        }

        if (expr.length == 0) return new C.Cons([]);
        let rest = expr.map((e) => compileExpression(e));

        // handle pairs and bindings
        if (rest.length == 3) {
            let [ fst, sym, snd ] = rest;
            if (sym instanceof C.Sym) {
                switch(sym.ident) {
                case ':' : return new C.Pair( fst, snd );
                default:
                    // let it fall through
                }
            }
        }

        // handle different list types ...
        if (rest.every((p) => p instanceof C.Pair)) {
            return new C.PairList( rest );
        }
        else {
            return new C.Cons( rest );
        }
    }

    return expr.map(compileExpression);
}

