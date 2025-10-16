import {
    TokenStream,
    ASTStream,
    isPipelineError
} from './Types.js';
import {
    ASTNode,
    NumberNode,
    StringNode,
    BooleanNode,
    SymbolNode,
    CallNode,
    QuoteNode,
    CondNode,
    DefNode,
    DefMacroNode,
    BeginNode,
    SetNode,
    TryNode,
    ThrowNode,
    LetNode,
    FunNode
} from './AST.js';

export class Parser {
    async *run(source: TokenStream): ASTStream {
        let stack: { type: 'CALL', elements: ASTNode[] }[] = [];
        for await (const token of source) {
            if (isPipelineError(token)) {
                yield token;
                continue;
            }
            try {
                switch (token.type) {
                    case 'STRING': {
                        const node = new StringNode(token.source);
                        const yielded = this.addNode(node, stack);
                        if (yielded) yield node;
                        break;
                    }
                    case 'NUMBER': {
                        const numValue = token.source.includes('.') ? parseFloat(token.source) : parseInt(token.source);
                        const node = new NumberNode(numValue);
                        const yielded = this.addNode(node, stack);
                        if (yielded) yield node;
                        break;
                    }
                    case 'BOOLEAN': {
                        const node = new BooleanNode(token.source === 'true');
                        const yielded = this.addNode(node, stack);
                        if (yielded) yield node;
                        break;
                    }
                    case 'SYMBOL': {
                        const node = new SymbolNode(token.source);
                        const yielded = this.addNode(node, stack);
                        if (yielded) yield node;
                        break;
                    }
                    case 'LPAREN':
                        stack.push({ type: 'CALL', elements: [] });
                        break;
                    case 'RPAREN':
                        if (stack.length === 0) throw new Error('Unmatched closing parenthesis');
                        const completed = stack.pop();
                        if (!completed) throw new Error('Unmatched closing parenthesis');
                        if (stack.length === 0) {
                            yield this.nodeFromCall(completed.elements);
                        } else {
                            this.addNode(this.nodeFromCall(completed.elements), stack);
                        }
                        break;
                    default:
                        throw new Error(`Unknown token type: ${(token as any).type}`);
                }
            } catch (e) {
                yield {
                    type: 'ERROR',
                    stage: 'Parser',
                    message: (e as Error).message
                };
            }
        }
        if (stack.length !== 0) {
            yield {
                type: 'ERROR',
                stage: 'Parser',
                message: 'Unclosed parenthesis or incomplete expression'
            };
        }
    }

    private addNode(node: ASTNode, stack: { type: 'CALL', elements: ASTNode[] }[]): boolean {
        if (stack.length === 0) {
            // Top-level node - should be yielded
            return true;
        } else {
            stack[stack.length - 1].elements.push(node);
            return false;
        }
    }

    private nodeFromCall(elements: ASTNode[]): ASTNode {
        // Special forms: quote, cond, def, defmacro, begin, set!, try, throw, let, fun
        if (elements.length > 0 && elements[0] instanceof SymbolNode) {
            const sym = elements[0].name;
            if (sym === 'quote' && elements.length === 2) {
                return new QuoteNode(elements[1]);
            }
            if (sym === 'begin') {
                // (begin expr1 expr2 ... exprN) - evaluate expressions in sequence
                if (elements.length < 2) {
                    throw new Error('Invalid begin syntax: expected (begin expr ...)');
                }
                return new BeginNode(elements.slice(1));
            }
            if (sym === 'throw') {
                // (throw expr)
                if (elements.length !== 2) {
                    throw new Error('Invalid throw syntax: expected (throw expr)');
                }
                return new ThrowNode(elements[1]);
            }
            if (sym === 'try') {
                // (try expr1 expr2 ... (catch var expr3 expr4 ...))
                if (elements.length < 3) {
                    throw new Error('Invalid try syntax: expected (try expr ... (catch var expr ...))');
                }

                // Find the catch clause - it should be a CallNode with 'catch' as first element
                let catchIndex = -1;
                for (let i = 1; i < elements.length; i++) {
                    if (elements[i] instanceof CallNode) {
                        const callNode = elements[i] as CallNode;
                        if (callNode.elements.length > 0 &&
                            callNode.elements[0] instanceof SymbolNode &&
                            (callNode.elements[0] as SymbolNode).name === 'catch') {
                            catchIndex = i;
                            break;
                        }
                    }
                }

                if (catchIndex === -1) {
                    throw new Error('Invalid try syntax: missing catch clause');
                }

                const tryBody = elements.slice(1, catchIndex);
                const catchClause = elements[catchIndex] as CallNode;

                // Parse catch clause: (catch var expr1 expr2 ...)
                if (catchClause.elements.length < 3) {
                    throw new Error('Invalid catch syntax: expected (catch var expr ...)');
                }
                if (!(catchClause.elements[1] instanceof SymbolNode)) {
                    throw new Error('Invalid catch syntax: error variable must be a symbol');
                }

                const catchVar = (catchClause.elements[1] as SymbolNode).name;
                const catchBody = catchClause.elements.slice(2);

                return new TryNode(tryBody, catchVar, catchBody);
            }
            if (sym === 'cond') {
                // cond clauses: (cond (test1 result1) (test2 result2) ... [else result])
                const clauses = [];
                let elseClause = undefined;
                for (let i = 1; i < elements.length; i++) {
                    const clause = elements[i];
                    if (clause instanceof CallNode && clause.elements.length === 2) {
                        const test = clause.elements[0];
                        const result = clause.elements[1];
                        if (test instanceof SymbolNode && test.name === 'else') {
                            elseClause = result;
                        } else {
                            clauses.push({ test, result });
                        }
                    }
                }
                return new CondNode(clauses, elseClause);
            }
            if (sym === 'fun') {
                // (fun (params...) body) - anonymous function
                if (elements.length !== 3) {
                    throw new Error('Invalid fun syntax: expected (fun (params...) body)');
                }
                if (!(elements[1] instanceof CallNode)) {
                    throw new Error('Invalid fun syntax: parameters must be a list');
                }
                const params = elements[1].elements.map((el: any) => {
                    if (!(el instanceof SymbolNode)) {
                        throw new Error('Invalid fun syntax: all parameters must be symbols');
                    }
                    return el.name;
                });
                return new FunNode(params, elements[2]);
            }
            if (sym === 'defmacro') {
                // (defmacro name (params...) body) - macro definition
                if (elements.length !== 4) {
                    throw new Error('Invalid defmacro syntax: expected (defmacro name (params...) body)');
                }
                if (!(elements[1] instanceof SymbolNode)) {
                    throw new Error('Invalid defmacro syntax: name must be a symbol');
                }
                if (!(elements[2] instanceof CallNode)) {
                    throw new Error('Invalid defmacro syntax: parameters must be a list');
                }
                const name = elements[1].name;
                const params = elements[2].elements.map((el: any) => {
                    if (!(el instanceof SymbolNode)) {
                        throw new Error('Invalid defmacro syntax: all parameters must be symbols');
                    }
                    return el.name;
                });
                return new DefMacroNode(name, params, elements[3]);
            }
            if (sym === 'def') {
                if (elements.length === 4 && elements[1] instanceof SymbolNode && elements[2] instanceof CallNode) {
                    // (def name (params...) body) - function definition
                    const name = elements[1].name;
                    const params = elements[2].elements.map((el: any) => el instanceof SymbolNode ? el.name : undefined).filter((n: string | undefined) => n !== undefined);
                    return new DefNode(name, params, elements[3]);
                } else if (elements.length === 3 && elements[1] instanceof SymbolNode) {
                    // (def name value) - simple value definition
                    const name = elements[1].name;
                    // Use null params to indicate value definition (not function)
                    return new DefNode(name, null as any, elements[2]);
                } else {
                    throw new Error('Invalid def syntax: expected (def name value) or (def name (params...) body)')
                }
            }
            if (sym === 'set!') {
                // (set! name value) - mutate existing variable
                if (elements.length !== 3) {
                    throw new Error('Invalid set! syntax: expected (set! name value)');
                }
                if (!(elements[1] instanceof SymbolNode)) {
                    throw new Error('Invalid set! syntax: name must be a symbol');
                }
                const name = elements[1].name;
                return new SetNode(name, elements[2]);
            }
            if (sym === 'let') {
                // (let ((var1 val1) (var2 val2) ...) body)
                if (elements.length !== 3) {
                    throw new Error('Invalid let syntax: expected (let ((var value) ...) body)');
                }

                const bindingsNode = elements[1];
                const body = elements[2];

                if (!(bindingsNode instanceof CallNode)) {
                    throw new Error('Invalid let syntax: bindings must be a list');
                }

                const bindings = [];
                for (const binding of bindingsNode.elements) {
                    if (!(binding instanceof CallNode) || binding.elements.length !== 2) {
                        throw new Error('Invalid let syntax: each binding must be (name value)');
                    }
                    const nameNode = binding.elements[0];
                    if (!(nameNode instanceof SymbolNode)) {
                        throw new Error('Invalid let syntax: binding name must be a symbol');
                    }
                    bindings.push({
                        name: nameNode.name,
                        value: binding.elements[1]
                    });
                }

                return new LetNode(bindings, body);
            }
        }
        return new CallNode(elements);
    }
}
