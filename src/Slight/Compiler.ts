
import { type ParseNode, isToken } from './Parser'

import * as C from './Terms';

export function compile (expr : ParseNode[]) : C.Term[] {

    const compileExpression = (node : ParseNode) : C.Term => {
        if (isToken(node)) {
            const expr = node.value;  // extract the string value
            switch (true) {
            case expr === 'true'       : return new C.Bool(true);
            case expr === 'false'      : return new C.Bool(false);
            case !isNaN(Number(expr))  : return new C.Num(Number(expr));
            case expr.charAt(0) === '"': return new C.Str(expr.slice(1, -1));
            case expr.charAt(0) === ':': return new C.Key(expr.slice(1));
            default                    : return new C.Sym(expr);
            }
        }

        if (node.length == 0) return new C.Cons([]);
        let rest = node.map((e) => compileExpression(e));
        return new C.Cons( rest );
    }

    return expr.map(compileExpression);
}

