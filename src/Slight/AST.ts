
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
            return await func(...args);
        }
        // If it's a user-defined function or closure
        if (func && typeof func === 'object' && 'params' in func && 'body' in func) {
            // Check if it's a closure with captured environment
            if ('capturedEnv' in func) {
                return interpreter.callClosure(func, args);
            } else {
                return interpreter.callUserFunction(func, args);
            }
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
// Anonymous Functions
// -----------------------------------------------------------------------------

export class FunNode extends ASTNode {
    type = 'FUN';
    constructor(
        public params: string[],
        public body: ASTNode
    ) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        // Create a closure that captures the current environment
        const closure = {
            params: this.params,
            body: this.body,
            capturedEnv: new Map(params) // Capture current lexical environment
        };
        return closure;
    }
}

// -----------------------------------------------------------------------------
// Macros
// -----------------------------------------------------------------------------

export class DefMacroNode extends ASTNode {
    type = 'DEFMACRO';
    constructor(
        public name: string,
        public params: string[],
        public body: ASTNode
    ) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        // Store the macro in the interpreter's macro map
        // Macros receive unevaluated AST nodes as arguments
        const macro = {
            params: this.params,
            body: this.body
        };
        interpreter.macros.set(this.name, macro);
        return true;
    }
}

// -----------------------------------------------------------------------------
// Definitions
// -----------------------------------------------------------------------------

export class DefNode extends ASTNode {
    type = 'DEF';
    constructor(
        public name: string,
        public params: string[] | null,
        public body: ASTNode
    ) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        // Check if this is a value definition (def name value) vs function definition
        if (this.params === null) {
            // Value definition (def name value)
            const value = await this.body.evaluate(interpreter, params);

            if (params.size > 0) {
                // Local scope - store in local environment
                params.set(this.name, value);
                return value;
            } else {
                // Global scope - check if value is a function/closure
                if (value && typeof value === 'object' && 'body' in value && 'params' in value) {
                    // It's a function/closure, store in functions map
                    interpreter.functions.set(this.name, value);
                } else {
                    // It's a regular value, store in bindings
                    interpreter.bindings.set(this.name, value);
                }
                return true;
            }
        } else {
            // Function definition (def name (params...) body)
            // Create a closure that captures the current environment
            const closure = {
                params: this.params,
                body: this.body,
                capturedEnv: new Map(params) // Capture current lexical environment
            };

            // If we're in a local scope, return the function object
            if (params.size > 0) {
                // Still register it locally for recursive calls
                params.set(this.name, closure);
                return closure;
            } else {
                // Global scope - register the function globally
                interpreter.functions.set(this.name, closure);
                return true;
            }
        }
    }
}

// -----------------------------------------------------------------------------
// Sequencing
// -----------------------------------------------------------------------------

export class BeginNode extends ASTNode {
    type = 'BEGIN';
    constructor(public expressions: ASTNode[]) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        let result: any = null;
        for (const expr of this.expressions) {
            result = await expr.evaluate(interpreter, params);
        }
        return result;
    }
}

// -----------------------------------------------------------------------------
// Mutation
// -----------------------------------------------------------------------------

export class SetNode extends ASTNode {
    type = 'SET';
    constructor(
        public name: string,
        public value: ASTNode
    ) { super(); }
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        const newValue = await this.value.evaluate(interpreter, params);

        // Search for the variable in local scope first, then global bindings
        if (params.has(this.name)) {
            // Update local scope
            params.set(this.name, newValue);
        } else if (interpreter.bindings.has(this.name)) {
            // Update global bindings
            interpreter.bindings.set(this.name, newValue);
        } else {
            throw new Error(`Cannot set! undefined variable: ${this.name}`);
        }

        return newValue;
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
