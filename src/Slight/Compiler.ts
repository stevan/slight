
import { Term, Pair, Cons, Sym, PairList } from './Terms'
import type { ParseExpr } from './Parser'

export function compile (expr : Term[]) : Term[] {

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
