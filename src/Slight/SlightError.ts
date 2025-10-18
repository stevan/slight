import { ASTNode } from './AST.js';

/**
 * Enhanced error class with location information and better formatting
 */
export class SlightError extends Error {
    constructor(
        message: string,
        public stage: string,
        public line?: number,
        public column?: number,
        public sourceCode?: string,
        public callStack?: string[]
    ) {
        super(message);
        this.name = 'SlightError';
    }

    static fromNode(message: string, stage: string, node?: ASTNode): SlightError {
        return new SlightError(
            message,
            stage,
            node?.location?.line,
            node?.location?.column
        );
    }

    /**
     * Format the error with location and context
     */
    format(includeContext = true): string {
        const parts: string[] = [];

        // Add location header if available
        if (this.line !== undefined && this.column !== undefined) {
            parts.push(`Error at line ${this.line}, column ${this.column}:`);
        } else {
            parts.push(`${this.stage} Error:`);
        }

        // Add source context if available
        if (includeContext && this.sourceCode && this.line !== undefined && this.column !== undefined) {
            const lines = this.sourceCode.split('\n');
            const errorLine = lines[this.line - 1];

            if (errorLine) {
                parts.push(`  ${errorLine}`);

                // Add error indicator
                const spaces = ' '.repeat(this.column - 1 + 2); // +2 for the "  " indent
                parts.push(`${spaces}^^^`);
            }
        }

        // Add the error message
        parts.push(`  ${this.message}`);

        // Add call stack if available
        if (this.callStack && this.callStack.length > 0) {
            parts.push('');
            parts.push('Call stack:');
            this.callStack.forEach(frame => {
                parts.push(`  at ${frame}`);
            });
        }

        return parts.join('\n');
    }

    /**
     * Convert to pipeline error format
     */
    toPipelineError() {
        return {
            type: 'ERROR' as const,
            stage: this.stage,
            message: this.message,
            details: {
                line: this.line,
                column: this.column,
                formatted: this.format()
            }
        };
    }
}

/**
 * Specific error types
 */
export class UndefinedSymbolError extends SlightError {
    constructor(symbol: string, node?: ASTNode) {
        super(
            `Undefined symbol: ${symbol}`,
            'Interpreter',
            node?.location?.line,
            node?.location?.column
        );
        this.name = 'UndefinedSymbolError';
    }
}

export class ArityError extends SlightError {
    constructor(functionName: string, expected: number, received: number, node?: ASTNode) {
        super(
            `Function '${functionName}' expects ${expected} arguments, but received ${received}`,
            'Interpreter',
            node?.location?.line,
            node?.location?.column
        );
        this.name = 'ArityError';
    }
}

export class TypeMismatchError extends SlightError {
    constructor(expected: string, received: string, context: string, node?: ASTNode) {
        super(
            `Type mismatch in ${context}: expected ${expected}, but received ${received}`,
            'Interpreter',
            node?.location?.line,
            node?.location?.column
        );
        this.name = 'TypeMismatchError';
    }
}

export class SyntaxError extends SlightError {
    constructor(message: string, node?: ASTNode) {
        super(
            message,
            'Parser',
            node?.location?.line,
            node?.location?.column
        );
        this.name = 'SyntaxError';
    }
}