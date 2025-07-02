import { ASTNode, NumberNode, StringNode, BooleanNode, SymbolNode, CallNode, QuoteNode, CondNode, DefNode } from '../../src/Slight/AST.js';

export function astToPlainObject(node: any): any {
    if (node instanceof NumberNode || node instanceof StringNode || node instanceof BooleanNode) {
        return { type: node.type, value: node.value };
    }
    if (node instanceof SymbolNode) {
        return { type: node.type, name: node.name };
    }
    if (node instanceof CallNode) {
        return { type: node.type, elements: node.elements.map(astToPlainObject) };
    }
    if (node instanceof QuoteNode) {
        return { type: node.type, expr: astToPlainObject(node.expr) };
    }
    if (node instanceof CondNode) {
        return {
            type: node.type,
            clauses: node.clauses.map((clause: any) => ({
                test: astToPlainObject(clause.test),
                result: astToPlainObject(clause.result)
            })),
            elseClause: node.elseClause ? astToPlainObject(node.elseClause) : undefined
        };
    }
    if (node instanceof DefNode) {
        return {
            type: node.type,
            name: node.name,
            params: node.params,
            body: astToPlainObject(node.body)
        };
    }
    // fallback for unknown node types
    return node;
}
