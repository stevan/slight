
import { type ParseNode, type ParseResult, isToken, getSpan } from './Parser'

import * as C from './Terms';

export function compile (parseResult : ParseResult) : C.Term[] {

    const compileExpression = (node : ParseNode) : C.Term => {
        if (isToken(node)) {
            const expr = node.value;
            const loc  = node.loc;
            let term: C.Term;
            switch (true) {
            case expr === 'true'       : term = new C.Bool(true);         break;
            case expr === 'false'      : term = new C.Bool(false);        break;
            case !isNaN(Number(expr))  : term = new C.Num(Number(expr));  break;
            case expr.charAt(0) === '"': term = new C.Str(expr.slice(1, -1)); break;
            case expr.charAt(0) === ':': term = new C.Key(expr.slice(1)); break;
            default                    : term = new C.Sym(expr);          break;
            }
            return term.setLoc(loc);
        }

        if (node.length == 0) return new C.Cons([]);
        let rest = node.map((e) => compileExpression(e));
        const cons = new C.Cons(rest);
        const span = getSpan(node);
        if (span) cons.setLoc(span);
        return cons;
    }

    return parseResult.exprs.map(compileExpression);
}

