
// interface Environment {
//     bindings
//     builtins
//     functions
//     callUserFunction(func, args)
// }

// -----------------------------------------------------------------------------
// AST node base type
// -----------------------------------------------------------------------------

export abstract class ASTNode {
    abstract type: string;
    abstract evaluate(interpreter: any, params: Map<string, any>): Promise<any>;
}

// -----------------------------------------------------------------------------
// Literals
// -----------------------------------------------------------------------------

export class NumberNode extends ASTNode {
    type = 'NUMBER';
    constructor(public value: number) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        return this.value;
    }
}

export class StringNode extends ASTNode {
    type = 'STRING';
    constructor(public value: string) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        return this.value;
    }
}

export class BooleanNode extends ASTNode {
    type = 'BOOLEAN';
    constructor(public value: boolean) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        return this.value;
    }
}

// -----------------------------------------------------------------------------
// Symbols
// -----------------------------------------------------------------------------

export class SymbolNode extends ASTNode {
    type = 'SYMBOL';
    constructor(public name: string) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        // Support dot notation: "obj.prop" or "obj.method"
        if (this.name.includes('.')) {
            const [objName, ...props] = this.name.split('.');
            let obj = params.get(objName) ?? interpreter.bindings.get(objName);
            for (const prop of props) {
                if (obj == null) throw new Error(`Cannot access property '${prop}' of null/undefined`);
                obj = obj[prop];
            }
            return obj;
        }
        if (params.has(this.name)) return params.get(this.name);
        if (interpreter.bindings.has(this.name)) return interpreter.bindings.get(this.name);
        if (interpreter.builtins.has(this.name)) return interpreter.builtins.get(this.name);
        if (interpreter.functions.has(this.name)) return interpreter.functions.get(this.name);
        throw new Error(`Undefined symbol: ${this.name}`);
    }
}

// -----------------------------------------------------------------------------
// Function calls
// -----------------------------------------------------------------------------

export class CallNode extends ASTNode {
    type = 'CALL';
    constructor(public elements: ASTNode[]) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        if (this.elements.length === 0) return [];
        // Evaluate the function or method
        const funcNode = this.elements[0];
        let func = await funcNode.evaluate(interpreter, params);
        // Evaluate arguments
        const args = [];
        for (let i = 1; i < this.elements.length; i++) {
            args.push(await this.elements[i].evaluate(interpreter, params));
        }
        // If the function is a method, bind 'this' if needed
        if (funcNode instanceof SymbolNode && funcNode.name.includes('.')) {
            // e.g., m.set => call with m as this
            const [objName, ...props] = funcNode.name.split('.');
            let obj = params.get(objName) ?? interpreter.bindings.get(objName);
            for (let j = 0; j < props.length - 1; j++) {
                obj = obj[props[j]];
            }
            const methodName = props[props.length - 1];
            if (obj == null) throw new Error(`Cannot call method '${methodName}' of null/undefined`);
            const method = obj[methodName];
            if (typeof method !== 'function') throw new Error(`'${methodName}' is not a function on object '${objName}'`);
            return method.apply(obj, args);
        }
        // If it's a JS function
        if (typeof func === 'function') {
            return func(...args);
        }
        // If it's a user-defined function
        if (func && typeof func === 'object' && 'params' in func && 'body' in func) {
            return interpreter.callUserFunction(func, args);
        }
        throw new Error(`Not a function: ${this.elements[0]}`);
    }
}

// -----------------------------------------------------------------------------
// Quoted values
// -----------------------------------------------------------------------------

export class QuoteNode extends ASTNode {
    type = 'QUOTE';
    constructor(public expr: ASTNode) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        // Return the quoted value as a JS value (array, string, number, etc.)
        return QuoteNode.astToValue(this.expr);
    }
    static astToValue(ast: any): any {
        if (ast instanceof NumberNode || ast instanceof StringNode || ast instanceof BooleanNode) {
            return ast.value;
        }
        if (ast instanceof SymbolNode) {
            return ast.name;
        }
        if (ast instanceof CallNode) {
            return ast.elements.map(QuoteNode.astToValue);
        }
        // fallback for unknown node types
        return ast;
    }
}

// -----------------------------------------------------------------------------
// Conditional
// -----------------------------------------------------------------------------

export class CondNode extends ASTNode {
    type = 'COND';
    constructor(
        public clauses: { test: ASTNode; result: ASTNode }[],
        public elseClause?: ASTNode
    ) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        for (const clause of this.clauses) {
            const testResult = await clause.test.evaluate(interpreter, params);
            if (testResult) {
                return await clause.result.evaluate(interpreter, params);
            }
        }
        if (this.elseClause) {
            return await this.elseClause.evaluate(interpreter, params);
        }
        return false;
    }
}

// -----------------------------------------------------------------------------
// Definitions
// -----------------------------------------------------------------------------

export class DefNode extends ASTNode {
    type = 'DEF';
    constructor(
        public name: string,
        public params: string[],
        public body: ASTNode
    ) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        // Register the function in the interpreter's function map
        interpreter.functions.set(this.name, { params: this.params, body: this.body });
        return true;
    }
}

// -----------------------------------------------------------------------------
// Bindings
// -----------------------------------------------------------------------------

export class LetNode extends ASTNode {
    type = 'LET';
    constructor(
        public bindings: Array<{ name: string, value: ASTNode }>,
        public body: ASTNode
    ) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        // Create a new scope with the parent params
        const localParams = new Map(params);

        // Evaluate and bind each binding in sequence
        // This allows later bindings to reference earlier ones
        for (const binding of this.bindings) {
            const value = await binding.value.evaluate(interpreter, localParams);
            localParams.set(binding.name, value);
        }

        // Evaluate the body with the new local bindings
        return await this.body.evaluate(interpreter, localParams);
    }
}
