# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build and Run
- **Build TypeScript**: `tsc` - Compiles all TypeScript to `js/` directory
- **Run REPL**: `npm run repl` - Starts interactive LISP interpreter with pipeline monitoring
- **Run Demo**: `npm run author` - Demonstrates concurrent interpreter execution
- **Run Tests**: `npm test` - Executes full test suite using Node.js native test runner
- **Run Single Test**: `tsc && node --test js/tests/<filename>.js` - Run specific test file

### Development Workflow
1. Make changes to TypeScript files in `src/`, `bin/`, or `tests/`
2. Run `tsc` to compile
3. Test changes with `npm test` or run REPL with `npm run repl`
4. The `js/` directory is gitignored - all edits should be in TypeScript files

## Architecture

### Pipeline-Based Design
Slight uses async generators to create a composable pipeline where each stage yields results incrementally:

```
Input → Tokenizer → Parser → Interpreter → Output
```

Each stage is an async generator that:
- Consumes items from the previous stage
- Processes them
- Yields results to the next stage
- Propagates errors as `PipelineError` objects

The main orchestrator (`src/Slight.ts`) composes these stages and provides `run()` for execution and `monitor()` for debugging with stage visibility.

### Object-Oriented AST
The current branch (`OO-guts`) implements an OO interpreter where each AST node class has its own `evaluate()` method:

- **Base class**: `ASTNode` in `src/Slight/AST.ts`
- **Node types**: `NumberNode`, `StringNode`, `BooleanNode`, `SymbolNode`, `CallNode`, `QuoteNode`, `CondNode`, `DefNode`, `LetNode`
- **Evaluation**: Each node implements `evaluate(interpreter, params)`
- **Context**: Interpreter maintains function definitions and builtin operations

### Key Design Patterns

1. **Async Generator Composition**: Each pipeline stage is an async generator function that yields processed items
2. **Error Propagation**: `PipelineError` type flows through all stages without interrupting the pipeline
3. **Parenthesis Balancing**: REPL accumulates multi-line input until parentheses balance
4. **Lexical Scoping**: Function parameters use `Map<string, any>` for local bindings
5. **Special Forms**: `quote`, `cond`, `def`, `let` have dedicated AST node types

## Testing Strategy

Tests use Node.js native test runner (`node:test`) with no external dependencies:

- **Unit tests**: Individual pipeline stages (Tokenizer, Parser, Interpreter)
- **Integration tests**: Full pipeline execution with various LISP expressions
- **Error tests**: Verify error propagation through pipeline
- **Test utilities**: `astToPlainObject` for AST assertion comparisons

## Current Implementation Notes

### Known Issues (from NOTES.md)
1. `PipelineError` needs proper constructor implementation
2. Parser and Tokenizer need cleanup/refactoring
3. AST and Interpreter are tightly coupled causing `any` type usage
4. Output implementation has type safety issues

### Recent Changes (from git history)
- Refactored from functional to OO interpreter design
- Renamed LIST to CALL for semantic clarity
- Removed compiler stage (direct interpretation only)
- Added logo display to REPL startup

### Type Safety Considerations
The codebase uses strict TypeScript settings but has some intentional relaxations:
- `strictNullChecks` is disabled (commented out in tsconfig.json)
- `noUncheckedIndexedAccess` is disabled
- Some `any` types exist due to AST/Interpreter coupling

When modifying code, maintain the existing balance between type safety and pragmatic implementation flexibility.