
import {
    PipelineError, isPipelineError,
    ASTNode, ASTStream,
    CompiledStream, FunctionDef
} from './Types.js';

export class Compiler {

    async *run(source: ASTStream): CompiledStream {
        for await (const ast of source) {
            if (isPipelineError(ast)) {
                yield ast;
                continue;
            }
            try {
                if (ast.type === 'LIST' && ast.elements.length > 0) {
                    const firstElement = ast.elements[0];
                    if (firstElement.type === 'SYMBOL' && firstElement.name == 'def') {
                        yield this.compileFunctionDef(ast);
                    } else {
                        yield { type: 'EXPRESSION', ast };
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

        if (nameNode.type !== 'SYMBOL')
            return { type: 'ERROR', stage: 'Compiler', message: 'Function name must be a symbol' };

        if (paramsNode.type !== 'LIST')
            return { type: 'ERROR', stage: 'Compiler', message: 'Parameters must be a list' };

        const params: string[] = [];
        for (const param of paramsNode.elements) {
            if (param.type !== 'SYMBOL')
                return { type: 'ERROR', stage: 'Compiler', message: 'All parameters must be symbols' };
            params.push(param.name);
        }

        return {
            type   : 'FUNCTION_DEF',
            name   : nameNode.name,
            params : params,
            body   : bodyNode
        };
    }

}
