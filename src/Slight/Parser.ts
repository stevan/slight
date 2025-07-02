import {
    TokenStream,
    PipelineError,
    isPipelineError
} from './Types.js';
import {
    NumberNode,
    StringNode,
    BooleanNode,
    SymbolNode,
    CallNode,
    QuoteNode,
    CondNode,
    DefNode
} from './AST.js';

export class Parser {
    async *run(source: TokenStream): AsyncGenerator<any, void, void> {
        let stack: { type: 'CALL', elements: any[] }[] = [];
        for await (const token of source) {
            if (isPipelineError(token)) {
                yield token;
                continue;
            }
            try {
                switch (token.type) {
                    case 'STRING':
                        this.addNode(new StringNode(token.source), stack);
                        break;
                    case 'NUMBER':
                        const numValue = token.source.includes('.') ? parseFloat(token.source) : parseInt(token.source);
                        this.addNode(new NumberNode(numValue), stack);
                        break;
                    case 'BOOLEAN':
                        this.addNode(new BooleanNode(token.source === 'true'), stack);
                        break;
                    case 'SYMBOL':
                        this.addNode(new SymbolNode(token.source), stack);
                        break;
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

    private addNode(node: any, stack: { type: 'CALL', elements: any[] }[]): void {
        if (stack.length === 0) {
            throw new Error('Cannot have a literal outside of an expression');
        } else {
            stack[stack.length - 1].elements.push(node);
        }
    }

    private nodeFromCall(elements: any[]): any {
        // Special forms: quote, cond, def
        if (elements.length > 0 && elements[0] instanceof SymbolNode) {
            const sym = elements[0].name;
            if (sym === 'quote' && elements.length === 2) {
                return new QuoteNode(elements[1]);
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
            if (sym === 'def') {
                if (elements.length === 4 && elements[1] instanceof SymbolNode && elements[2] instanceof CallNode) {
                    // (def name (params...) body)
                    const name = elements[1].name;
                    const params = elements[2].elements.map((el: any) => el instanceof SymbolNode ? el.name : undefined).filter((n: string | undefined) => n !== undefined);
                    return new DefNode(name, params, elements[3]);
                } else {
                    return {
                        type: 'ERROR',
                        stage: 'Parser',
                        message: 'Invalid def syntax: expected (def name (params...) body)'
                    };
                }
            }
        }
        return new CallNode(elements);
    }
}
