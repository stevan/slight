import { ASTNode, NumberNode, StringNode, BooleanNode, SymbolNode, CallNode,
         QuoteNode, DefNode, CondNode, LetNode, FunNode, BeginNode } from './AST.js';
import { Tokenizer } from './Tokenizer.js';
import { Parser } from './Parser.js';
import { MacroExpander } from './MacroExpander.js';
import { isPipelineError } from './Types.js';

export class DebugTools {
    private tokenizer = new Tokenizer();
    private parser = new Parser();
    private macroExpander = new MacroExpander();

    /**
     * Show tokens for a given expression
     */
    async showTokens(code: string): Promise<string> {
        const lines: string[] = ['=== TOKENS ==='];

        async function* stringSource() { yield code; }
        const tokens = this.tokenizer.run(stringSource());

        for await (const token of tokens) {
            if (isPipelineError(token)) {
                lines.push(`ERROR: ${token.message}`);
            } else {
                lines.push(`${token.type.padEnd(10)} "${token.source}"`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Show AST for a given expression
     */
    async showAST(code: string): Promise<string> {
        async function* stringSource() { yield code; }

        const tokens = this.tokenizer.run(stringSource());
        const asts = this.parser.run(tokens);

        const lines: string[] = ['=== AST ==='];

        for await (const ast of asts) {
            if (isPipelineError(ast)) {
                lines.push(`ERROR: ${ast.message}`);
            } else {
                lines.push(this.formatAST(ast, 0));
            }
        }

        return lines.join('\n');
    }

    /**
     * Show macro expansion for a given expression
     */
    async showMacroExpansion(code: string): Promise<string> {
        async function* stringSource() { yield code; }

        const tokens = this.tokenizer.run(stringSource());
        const asts = this.parser.run(tokens);
        const expanded = this.macroExpander.run(asts);

        const lines: string[] = ['=== MACRO EXPANSION ==='];
        lines.push('Original:');
        lines.push(`  ${code}`);
        lines.push('Expanded:');

        for await (const ast of expanded) {
            if (isPipelineError(ast)) {
                lines.push(`  ERROR: ${ast.message}`);
            } else {
                lines.push('  ' + this.astToCode(ast));
            }
        }

        return lines.join('\n');
    }

    /**
     * Format AST node as indented tree structure
     */
    private formatAST(node: ASTNode, indent: number): string {
        const spaces = '  '.repeat(indent);

        if (node instanceof NumberNode) {
            return `${spaces}NumberNode { value: ${node.value} }`;
        }
        if (node instanceof StringNode) {
            return `${spaces}StringNode { value: "${node.value}" }`;
        }
        if (node instanceof BooleanNode) {
            return `${spaces}BooleanNode { value: ${node.value} }`;
        }
        if (node instanceof SymbolNode) {
            return `${spaces}SymbolNode { name: "${node.name}" }`;
        }
        if (node instanceof QuoteNode) {
            return `${spaces}QuoteNode {\n${this.formatAST(node.expr, indent + 1)}\n${spaces}}`;
        }
        if (node instanceof CallNode) {
            const elements = node.elements
                .map(el => this.formatAST(el, indent + 1))
                .join('\n');
            return `${spaces}CallNode {\n${elements}\n${spaces}}`;
        }
        if (node instanceof DefNode) {
            return `${spaces}DefNode { name: "${node.name}", params: ${JSON.stringify(node.params)} }`;
        }
        if (node instanceof CondNode) {
            return `${spaces}CondNode { clauses: ${node.clauses.length} }`;
        }
        if (node instanceof LetNode) {
            return `${spaces}LetNode { bindings: ${node.bindings.length} }`;
        }
        if (node instanceof FunNode) {
            return `${spaces}FunNode { params: ${JSON.stringify(node.params)} }`;
        }
        if (node instanceof BeginNode) {
            return `${spaces}BeginNode { expressions: ${node.expressions.length} }`;
        }

        return `${spaces}${(node as any).type || 'Unknown'}Node`;
    }

    /**
     * Convert AST back to code representation
     */
    private astToCode(node: ASTNode): string {
        if (node instanceof NumberNode) {
            return node.value.toString();
        }
        if (node instanceof StringNode) {
            return `"${node.value}"`;
        }
        if (node instanceof BooleanNode) {
            return node.value.toString();
        }
        if (node instanceof SymbolNode) {
            return node.name;
        }
        if (node instanceof QuoteNode) {
            return `'${this.astToCode(node.expr)}`;
        }
        if (node instanceof CallNode) {
            const elements = node.elements.map(el => this.astToCode(el)).join(' ');
            return `(${elements})`;
        }
        if (node instanceof DefNode) {
            if (node.params) {
                return `(def ${node.name} (${node.params.join(' ')}) ${this.astToCode(node.body)})`;
            } else {
                return `(def ${node.name} ${this.astToCode(node.body)})`;
            }
        }
        if (node instanceof CondNode) {
            const clauses = node.clauses
                .map((c: any) => `(${this.astToCode(c.test)} ${this.astToCode(c.result)})`)
                .join(' ');
            const elseClause = node.elseClause ? ` (else ${this.astToCode(node.elseClause)})` : '';
            return `(cond ${clauses}${elseClause})`;
        }
        if (node instanceof LetNode) {
            const bindings = node.bindings
                .map((b: any) => `(${b.name} ${this.astToCode(b.value)})`)
                .join(' ');
            return `(let (${bindings}) ${this.astToCode(node.body)})`;
        }
        if (node instanceof FunNode) {
            return `(fun (${node.params.join(' ')}) ${this.astToCode(node.body)})`;
        }
        if (node instanceof BeginNode) {
            const exprs = node.expressions.map(e => this.astToCode(e)).join(' ');
            return `(begin ${exprs})`;
        }

        return '<unknown>';
    }

    /**
     * Create execution trace for debugging
     */
    async trace(code: string, interpreter: any): Promise<string[]> {
        const trace: string[] = [];

        // Hook into interpreter evaluation
        const originalEval = interpreter.evaluate;
        interpreter.evaluate = async function(...args: any[]) {
            trace.push(`Evaluating: ${args[0]}`);
            const result = await originalEval.apply(interpreter, args);
            trace.push(`  Result: ${result}`);
            return result;
        };

        // Run the code
        async function* stringSource() { yield code; }
        const tokens = this.tokenizer.run(stringSource());
        const asts = this.parser.run(tokens);
        const expanded = this.macroExpander.run(asts);

        for await (const result of interpreter.run(expanded)) {
            // Consume results
        }

        // Restore original eval
        interpreter.evaluate = originalEval;

        return trace;
    }
}