import { ASTNode } from './Parser.js';
import { PipelineError, isPipelineError } from './PipelineError.js';

export interface FunctionDef {
  type   : 'FUNCTION_DEF';
  name   : string;
  params : string[];
  body   : ASTNode;
}

export interface Expression {
  type : 'EXPRESSION';
  ast  : ASTNode;
}

export type CompilerOutput = FunctionDef | Expression;

export class Compiler {
    async *run(source: AsyncGenerator<ASTNode | PipelineError, void, void>): AsyncGenerator<CompilerOutput | PipelineError, void, void> {
        for await (const ast of source) {
            if (isPipelineError(ast)) {
                yield ast;
                continue;
            }
            try {
                if (ast.type === 'LIST' && ast.elements.length > 0) {
                    const firstElement = ast.elements[0];
                    if (firstElement.type === 'SYMBOL') {
                        switch (firstElement.name) {
                            case 'def': {
                                const defResult = this.compileFunctionDef(ast);
                                if (isPipelineError(defResult)) {
                                    yield defResult;
                                } else {
                                    yield defResult;
                                }
                                break;
                            }
                            default: {
                                const exprResult = this.compileExpression(ast);
                                if (isPipelineError(exprResult)) {
                                    yield exprResult;
                                } else {
                                    yield { type: 'EXPRESSION', ast: exprResult };
                                }
                                break;
                            }
                        }
                    } else {
                        const exprResult = this.compileExpression(ast);
                        if (isPipelineError(exprResult)) {
                            yield exprResult;
                        } else {
                            yield { type: 'EXPRESSION', ast: exprResult };
                        }
                    }
                } else {
                    yield { type: 'EXPRESSION', ast };
                }
            } catch (e) {
                yield { type: 'ERROR', stage: 'Compiler', message: (e as Error).message };
            }
        }
    }
    private compileFunctionDef(ast: ASTNode): FunctionDef | PipelineError {
        if (ast.type !== 'LIST' || ast.elements.length !== 4) {
            return { type: 'ERROR', stage: 'Compiler', message: 'Invalid def syntax: expected (def name (params...) body)' };
        }
        const [defSymbol, nameNode, paramsNode, bodyNode] = ast.elements;
        if (nameNode.type !== 'SYMBOL') {
            return { type: 'ERROR', stage: 'Compiler', message: 'Function name must be a symbol' };
        }
        if (paramsNode.type !== 'LIST') {
            return { type: 'ERROR', stage: 'Compiler', message: 'Parameters must be a list' };
        }
        const params: string[] = [];
        for (const param of paramsNode.elements) {
            if (param.type !== 'SYMBOL') {
                return { type: 'ERROR', stage: 'Compiler', message: 'All parameters must be symbols' };
            }
            params.push(param.name);
        }
        const compiledBody = this.compileExpression(bodyNode);
        if (isPipelineError(compiledBody)) {
            return compiledBody;
        }
        return {
            type   : 'FUNCTION_DEF',
            name   : nameNode.name,
            params : params,
            body   : compiledBody
        };
    }
    private compileExpression(ast: ASTNode): ASTNode | PipelineError {
        if (ast.type === 'LIST' && ast.elements.length > 0) {
            const firstElement = ast.elements[0];
            if (firstElement.type === 'SYMBOL') {
                switch (firstElement.name) {
                    case 'cond': {
                        const condResult = this.compileCond(ast);
                        if (isPipelineError(condResult)) {
                            return condResult;
                        }
                        return condResult;
                    }
                    case 'quote': {
                        const quoteResult = this.compileQuote(ast);
                        if (isPipelineError(quoteResult)) {
                            return quoteResult;
                        }
                        return quoteResult;
                    }
                    default:
                        return {
                            type     : 'LIST',
                            elements : ast.elements.map(elem => {
                                const res = this.compileExpression(elem);
                                if (isPipelineError(res)) throw new Error(res.message);
                                return res;
                            })
                        };
                }
            }
            return {
                type     : 'LIST',
                elements : ast.elements.map(elem => {
                    const res = this.compileExpression(elem);
                    if (isPipelineError(res)) throw new Error(res.message);
                    return res;
                })
            };
        }
        return ast;
    }
    private compileCond(ast: ASTNode): ASTNode | PipelineError {
        if (ast.type !== 'LIST' || ast.elements.length < 2) {
            return { type: 'ERROR', stage: 'Compiler', message: 'Invalid cond syntax' };
        }
        const clauses: any[] = [];
        let elseClause: ASTNode | undefined;
        for (let i = 1; i < ast.elements.length; i++) {
            const clause = ast.elements[i];
            if (clause.type !== 'LIST' || clause.elements.length !== 2) {
                return { type: 'ERROR', stage: 'Compiler', message: 'Each cond clause must be (test result)' };
            }
            const [test, result] = clause.elements;
            const testCompiled = this.compileExpression(test);
            if (isPipelineError(testCompiled)) return testCompiled;
            const resultCompiled = this.compileExpression(result);
            if (isPipelineError(resultCompiled)) return resultCompiled;
            if (test.type === 'SYMBOL' && test.name === 'else') {
                elseClause = resultCompiled;
            } else {
                clauses.push({
                    test   : testCompiled,
                    result : resultCompiled
                });
            }
        }
        return { type: 'COND', clauses, elseClause };
    }
    private compileQuote(ast: ASTNode): ASTNode | PipelineError {
        if (ast.type !== 'LIST' || ast.elements.length !== 2) {
            return { type: 'ERROR', stage: 'Compiler', message: 'Invalid quote syntax: expected (quote expr)' };
        }
        const [quoteSymbol, expr] = ast.elements;
        return { type : 'QUOTE', expr : expr };
    }
}
