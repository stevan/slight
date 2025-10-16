import {
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
    LetNode,
    FunNode
} from './AST.js';

export class MacroExpander {
    private macros: Map<string, { params: string[], body: ASTNode }> = new Map();

    async *run(source: ASTStream): ASTStream {
        for await (const node of source) {
            if (isPipelineError(node)) {
                yield node;
                continue;
            }
            try {
                // If it's a macro definition, register it but don't expand
                if (node instanceof DefMacroNode) {
                    this.macros.set(node.name, {
                        params: node.params,
                        body: node.body
                    });
                    yield node;
                    continue;
                }

                // Expand macros in the node recursively until no more expansions
                const expanded = await this.expandUntilDone(node);
                yield expanded;
            } catch (e) {
                yield {
                    type: 'ERROR',
                    stage: 'MacroExpander',
                    message: (e as Error).message
                };
            }
        }
    }

    private async expandUntilDone(node: ASTNode, depth: number = 0): Promise<ASTNode> {
        const maxDepth = 100; // Prevent infinite expansion loops
        if (depth > maxDepth) {
            throw new Error('Macro expansion exceeded maximum depth - possible infinite expansion');
        }

        // Check if this node is a macro call
        if (node instanceof CallNode && node.elements.length > 0) {
            const first = node.elements[0];
            if (first instanceof SymbolNode && this.macros.has(first.name)) {
                // Expand the macro and then recursively expand the result
                const expanded = await this.expandMacroCall(node);
                return this.expandUntilDone(expanded, depth + 1);
            }
        }

        // Not a macro call - recursively expand sub-nodes
        return this.expand(node);
    }

    private async expand(node: ASTNode): Promise<ASTNode> {
        // Literals don't expand
        if (node instanceof NumberNode || node instanceof StringNode || node instanceof BooleanNode) {
            return node;
        }

        // Symbols don't expand
        if (node instanceof SymbolNode) {
            return node;
        }

        // Quote nodes don't expand their contents
        if (node instanceof QuoteNode) {
            return node;
        }

        // Expand defmacro bodies (though they should already be registered)
        if (node instanceof DefMacroNode) {
            return new DefMacroNode(
                node.name,
                node.params,
                await this.expandUntilDone(node.body)
            );
        }

        // Expand def bodies
        if (node instanceof DefNode) {
            return new DefNode(
                node.name,
                node.params,
                await this.expandUntilDone(node.body)
            );
        }

        // Expand let bindings and body
        if (node instanceof LetNode) {
            const expandedBindings = [];
            for (const binding of node.bindings) {
                expandedBindings.push({
                    name: binding.name,
                    value: await this.expandUntilDone(binding.value)
                });
            }
            return new LetNode(expandedBindings, await this.expandUntilDone(node.body));
        }

        // Expand fun body
        if (node instanceof FunNode) {
            return new FunNode(node.params, await this.expandUntilDone(node.body));
        }

        // Expand cond clauses
        if (node instanceof CondNode) {
            const expandedClauses = [];
            for (const clause of node.clauses) {
                expandedClauses.push({
                    test: await this.expandUntilDone(clause.test),
                    result: await this.expandUntilDone(clause.result)
                });
            }
            const expandedElse = node.elseClause ? await this.expandUntilDone(node.elseClause) : undefined;
            return new CondNode(expandedClauses, expandedElse);
        }

        // CallNode - recursively expand elements (but don't expand macro calls here)
        if (node instanceof CallNode) {
            if (node.elements.length === 0) {
                return node;
            }

            // Don't expand macro calls here - that's handled by expandUntilDone
            // Just recursively expand non-macro-call elements
            const first = node.elements[0];
            if (first instanceof SymbolNode && this.macros.has(first.name)) {
                // This is a macro call - don't expand it here
                return node;
            }

            // Not a macro call - recursively expand elements
            const expandedElements = [];
            for (const element of node.elements) {
                expandedElements.push(await this.expandUntilDone(element));
            }
            return new CallNode(expandedElements);
        }

        return node;
    }

    private async expandMacroCall(node: CallNode): Promise<ASTNode> {
        const first = node.elements[0];
        if (!(first instanceof SymbolNode) || !this.macros.has(first.name)) {
            throw new Error('expandMacroCall called on non-macro node');
        }

        const macro = this.macros.get(first.name)!;
        const args = node.elements.slice(1);

        if (args.length !== macro.params.length) {
            throw new Error(`Macro ${first.name}: expected ${macro.params.length} arguments, got ${args.length}`);
        }

        // Create bindings for macro parameters as quoted AST (unevaluated)
        const bindings = new Map<string, any>();
        for (let i = 0; i < macro.params.length; i++) {
            // Convert AST arg to value form for use in macro body
            bindings.set(macro.params[i], this.astToValue(args[i]));
        }

        // Evaluate the macro body to get the expansion (as a value)
        // We need a minimal interpreter context for this
        const { Interpreter } = await import('./Interpreter.js');
        const tempInterpreter = new Interpreter();
        const expandedValue = await macro.body.evaluate(tempInterpreter, bindings);

        // Convert the expanded value back to AST
        return this.valueToAst(expandedValue);
    }

    private astToValue(node: ASTNode): any {
        if (node instanceof NumberNode || node instanceof StringNode || node instanceof BooleanNode) {
            return node.value;
        }
        if (node instanceof SymbolNode) {
            return node.name;
        }
        if (node instanceof CallNode) {
            return node.elements.map(el => this.astToValue(el));
        }
        if (node instanceof QuoteNode) {
            return this.astToValue(node.expr);
        }
        throw new Error(`Cannot convert ${node.type} to value for macro expansion`);
    }

    private valueToAst(value: any): ASTNode {
        if (typeof value === 'number') {
            return new NumberNode(value);
        }
        if (typeof value === 'string') {
            // Strings from quoted symbols should become SymbolNodes
            // Strings from actual string literals would have quotes, but those aren't common in macro bodies
            // For now, treat all strings as symbols (this is the Lisp way - symbols are represented as strings)
            return new SymbolNode(value);
        }
        if (typeof value === 'boolean') {
            return new BooleanNode(value);
        }
        if (Array.isArray(value)) {
            const elements = value.map(v => this.valueToAst(v));
            const callNode = new CallNode(elements);

            // Check if this is a special form and convert to appropriate node type
            if (elements.length > 0 && elements[0] instanceof SymbolNode) {
                const firstSymbol = elements[0].name;

                // Handle special forms
                if (firstSymbol === 'quote' && elements.length === 2) {
                    return new QuoteNode(elements[1]);
                }

                if (firstSymbol === 'cond') {
                    // (cond (test1 result1) (test2 result2) ... [else result])
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

                // Add other special forms as needed (def, let, fun, etc.)
            }

            return callNode;
        }
        throw new Error(`Cannot convert ${typeof value} to AST: ${JSON.stringify(value)}`);
    }

    private async substituteParams(node: ASTNode, bindings: Map<string, ASTNode>): Promise<ASTNode> {
        // If it's a symbol that matches a parameter, substitute it
        if (node instanceof SymbolNode && bindings.has(node.name)) {
            return bindings.get(node.name)!;
        }

        // Literals pass through
        if (node instanceof NumberNode || node instanceof StringNode || node instanceof BooleanNode) {
            return node;
        }

        // Symbols that aren't parameters pass through
        if (node instanceof SymbolNode) {
            return node;
        }

        // Quote nodes don't substitute
        if (node instanceof QuoteNode) {
            return node;
        }

        // Recursively substitute in compound structures
        if (node instanceof CallNode) {
            const substitutedElements = [];
            for (const element of node.elements) {
                substitutedElements.push(await this.substituteParams(element, bindings));
            }
            return new CallNode(substitutedElements);
        }

        if (node instanceof DefNode) {
            return new DefNode(
                node.name,
                node.params,
                await this.substituteParams(node.body, bindings)
            );
        }

        if (node instanceof DefMacroNode) {
            return new DefMacroNode(
                node.name,
                node.params,
                await this.substituteParams(node.body, bindings)
            );
        }

        if (node instanceof LetNode) {
            const substitutedBindings = [];
            for (const binding of node.bindings) {
                substitutedBindings.push({
                    name: binding.name,
                    value: await this.substituteParams(binding.value, bindings)
                });
            }
            return new LetNode(
                substitutedBindings,
                await this.substituteParams(node.body, bindings)
            );
        }

        if (node instanceof FunNode) {
            return new FunNode(
                node.params,
                await this.substituteParams(node.body, bindings)
            );
        }

        if (node instanceof CondNode) {
            const substitutedClauses = [];
            for (const clause of node.clauses) {
                substitutedClauses.push({
                    test: await this.substituteParams(clause.test, bindings),
                    result: await this.substituteParams(clause.result, bindings)
                });
            }
            const substitutedElse = node.elseClause
                ? await this.substituteParams(node.elseClause, bindings)
                : undefined;
            return new CondNode(substitutedClauses, substitutedElse);
        }

        return node;
    }
}
