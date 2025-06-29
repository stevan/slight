import { PipelineError, isPipelineError } from './Tokenizer.js';

export type CaseClause = { test : ASTNode, result : ASTNode };

export type ASTNode =
  | { type: 'NUMBER',  value    : number }
  | { type: 'STRING',  value    : string }
  | { type: 'BOOLEAN', value    : boolean }
  | { type: 'SYMBOL',  name     : string }
  | { type: 'LIST',    elements : ASTNode[] }
  | { type: 'QUOTE',   expr     : ASTNode }
  | { type: 'COND',    clauses  : CaseClause[], elseClause?: ASTNode | undefined };

export class Parser {
    async *run(source: AsyncGenerator<any, void, void>): AsyncGenerator<ASTNode | PipelineError, void, void> {
        let stack: { type: 'LIST', elements: ASTNode[] }[] = [];
        for await (const token of source) {
            if (isPipelineError(token)) {
                yield token;
                continue;
            }
            try {
                switch (token.type) {
                    case 'STRING':
                        const stringNode = { type: 'STRING' as const, value: token.source };
                        this.addNode(stringNode, stack);
                        break;
                    case 'NUMBER':
                        const numValue = token.source.includes('.') ? parseFloat(token.source) : parseInt(token.source);
                        const numberNode = { type: 'NUMBER' as const, value: numValue };
                        this.addNode(numberNode, stack);
                        break;
                    case 'BOOLEAN':
                        const boolNode = { type: 'BOOLEAN' as const, value: token.source === 'true' };
                        this.addNode(boolNode, stack);
                        break;
                    case 'SYMBOL':
                        const symbolNode = { type: 'SYMBOL' as const, name: token.source };
                        this.addNode(symbolNode, stack);
                        break;
                    case 'LPAREN':
                        stack.push({ type: 'LIST', elements: [] });
                        break;
                    case 'RPAREN':
                        if (stack.length === 0) {
                            yield { type: 'ERROR', stage: 'Parser', message: 'Unmatched closing parenthesis' };
                            break;
                        }
                        const expr = stack.pop()!;
                        if (stack.length === 0) {
                            yield expr as ASTNode;
                        } else {
                            stack[stack.length - 1].elements.push(expr as ASTNode);
                        }
                        break;
                    default:
                        yield { type: 'ERROR', stage: 'Parser', message: `Unknown token type: ${(token as any).type}` };
                }
            } catch (e) {
                yield { type: 'ERROR', stage: 'Parser', message: (e as Error).message };
            }
        }
        if (stack.length > 0) {
            yield { type: 'ERROR', stage: 'Parser', message: `Unbalanced parentheses - ${stack.length} unclosed expressions` };
        }
    }
    private addNode(node: ASTNode, stack: { type: 'LIST', elements: ASTNode[] }[]): void {
        if (stack.length === 0) {
            throw new Error("Cannot have a literal outside of an expression");
        } else {
            stack[stack.length - 1].elements.push(node);
        }
    }
}
