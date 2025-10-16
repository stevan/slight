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
Input → Tokenizer → Parser → MacroExpander → Interpreter → Output
```

Each stage is an async generator that:
- Consumes items from the previous stage
- Processes them
- Yields results to the next stage
- Propagates errors as `PipelineError` objects

The main orchestrator (`src/Slight.ts`) composes these stages and provides `run()` for execution.

**MacroExpander Stage** (`src/Slight/MacroExpander.ts`):
- Inserted between Parser and Interpreter for compile-time transformations
- Registers macro definitions via `DefMacroNode`
- Expands macro calls by evaluating macro bodies with unevaluated AST arguments
- Converts expansion results back to AST (handling special forms like `cond`)
- Recursively expands nested macros with depth limits for safety

**Process System** (`src/Slight/ProcessRuntime.ts`, `src/Slight/AsyncQueue.ts`):
- Erlang-style actor model for concurrent programming
- `ProcessRuntime` singleton manages all spawned processes globally
- Each process runs in isolated `Slight` instance with separate `Interpreter`
- `AsyncQueue` provides blocking message queues using Promise-based dequeue
- Process PIDs start at 1 (main process is PID 0)
- Messages are `[sender_pid, data]` tuples for easy destructuring
- Automatic registration of PID 0 when spawned processes send to main
- Test isolation via `ProcessRuntime.reset()` to avoid inter-test pollution
- **Spawn with Functions**: `spawn` accepts named functions with arguments (e.g., `(spawn worker 42)`)
- **Share-Nothing Model**: Child processes get independent copies of parent's `functions`, `macros`, and `bindings`
- Parent state is cloned at spawn time via `new Map()` - changes after spawn don't affect child
- Function arguments are serialized to code strings for spawning

### Object-Oriented AST
The OO interpreter implements each AST node class with its own `evaluate()` method:

- **Base class**: `ASTNode` in `src/Slight/AST.ts`
- **Node types**: `NumberNode`, `StringNode`, `BooleanNode`, `SymbolNode`, `CallNode`, `QuoteNode`, `CondNode`, `DefNode`, `DefMacroNode`, `LetNode`, `FunNode`
- **Evaluation**: Each node implements `evaluate(interpreter, params)`
- **Context**: Interpreter maintains function definitions, macro definitions, and builtin operations

### Key Design Patterns

1. **Async Generator Composition**: Each pipeline stage is an async generator function that yields processed items
2. **Error Propagation**: `PipelineError` type flows through all stages without interrupting the pipeline
3. **Parenthesis Balancing**: REPL accumulates multi-line input until parentheses balance
4. **Lexical Scoping**: Function parameters use `Map<string, any>` for local bindings
5. **Special Forms**: `quote`, `cond`, `def`, `defmacro`, `let`, `fun` have dedicated AST node types
6. **Macro Hygiene**: Macros expand to proper AST nodes (not raw data), preserving special form semantics

## Testing Strategy

Tests use Node.js native test runner (`node:test`) with no external dependencies:

- **Unit tests**: Individual pipeline stages (Tokenizer, Parser, Interpreter)
- **Integration tests**: Full pipeline execution with various LISP expressions
- **Error tests**: Verify error propagation through pipeline
- **Test utilities**: `astToPlainObject` for AST assertion comparisons

## Current Implementation Notes

### Recent Changes
- **Function-Based Spawn**: `spawn` now accepts named functions with arguments (e.g., `(spawn worker 42)`)
  - Child processes automatically inherit parent's functions, macros, and bindings
  - Share-nothing concurrency via cloned interpreter state at spawn time
  - Arguments are serialized to code strings (supports numbers, strings, booleans, lists)
- **Process System**: Added Erlang-style actor model with `spawn`, `send`, `recv`, `self`, `is-alive?`, `kill`, `processes`
- **Parser Fix**: Top-level literals (symbols, numbers, strings) now work correctly outside expressions
- **Tokenizer Fix**: Escaped quotes in strings now handled properly (`"(?:[^"\\]|\\.)*"`)
- **Macro System**: Added `defmacro` and MacroExpander pipeline stage for compile-time metaprogramming
- Macro expansion happens at compile-time before interpretation
- Macros can generate special forms (`cond`, `quote`, etc.) correctly
- Previously: Refactored from functional to OO interpreter design
- Previously: Renamed LIST to CALL for semantic clarity
- Previously: Removed compiler stage (direct interpretation only)

### Type Safety Considerations
The codebase uses strict TypeScript settings but has some intentional relaxations:
- `strictNullChecks` is disabled (commented out in tsconfig.json)
- `noUncheckedIndexedAccess` is disabled
- Some `any` types exist due to AST/Interpreter coupling

When modifying code, maintain the existing balance between type safety and pragmatic implementation flexibility.