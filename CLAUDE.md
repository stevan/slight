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

### Interpreter Architecture
The interpreter uses an inheritance hierarchy to share code between Node.js and browser implementations:

```
        CoreInterpreter (base class)
       /                \
  Interpreter      BrowserInterpreter
  (Node.js)          (Browser)
```

- **CoreInterpreter** (`src/Slight/CoreInterpreter.ts`): Contains all platform-agnostic functionality including basic operators, list operations, boolean logic, and the core evaluation methods
- **Interpreter** (`src/Slight/Interpreter.ts`): Extends CoreInterpreter with Node.js-specific features (file I/O, system operations)
- **BrowserInterpreter** (`src/Slight/BrowserInterpreter.ts`): Extends CoreInterpreter for browser compatibility

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
- **Node types**: `NumberNode`, `StringNode`, `BooleanNode`, `SymbolNode`, `CallNode`, `QuoteNode`, `CondNode`, `DefNode`, `DefMacroNode`, `BeginNode`, `SetNode`, `TryNode`, `ThrowNode`, `LetNode`, `FunNode`
- **Evaluation**: Each node implements `evaluate(interpreter, params)`
- **Context**: Interpreter maintains function definitions, macro definitions, and builtin operations

### Key Design Patterns

1. **Async Generator Composition**: Each pipeline stage is an async generator function that yields processed items
2. **Error Propagation**: `PipelineError` type flows through all stages without interrupting the pipeline
3. **Parenthesis Balancing**: REPL accumulates multi-line input until parentheses balance
4. **Lexical Scoping**: Function parameters use `Map<string, any>` for local bindings
5. **Special Forms**: `quote`, `cond`, `def`, `defmacro`, `begin`, `set!`, `try`, `throw`, `let`, `fun` have dedicated AST node types
6. **Macro Hygiene**: Macros expand to proper AST nodes (not raw data), preserving special form semantics
7. **Error Handling**: Try/catch mechanism with error objects containing `message` and `type` fields

## Testing Strategy

Tests use Node.js native test runner (`node:test`) with no external dependencies:

- **Unit tests**: Individual pipeline stages (Tokenizer, Parser, Interpreter)
- **Integration tests**: Full pipeline execution with various LISP expressions
- **Error tests**: Verify error propagation through pipeline
- **Test utilities**: `astToPlainObject` for AST assertion comparisons

## Current Implementation Notes

### Recent Changes
- **I/O and Logging System**: Added comprehensive output and logging primitives (2025-10-17)
  - **I/O Functions**: `print` (no newline), `say` (with newline) for stdout
  - **Logging Functions**: `log/info`, `log/debug`, `log/warn`, `log/error` for structured logging
  - **Logging Control**: `log/enable` and `log/disable` for conditional logging
  - **Output Streams**: Added `StandardOutput` and `StandardError` classes in `src/Slight/Outputs.ts`
  - StandardOutput filters STDOUT tokens to `process.stdout` (Node) / `console.log` (Browser)
  - StandardError filters non-STDOUT tokens to `process.stderr` (Node) / appropriate console methods (Browser)
  - `warn` is an alias to `log/warn` and respects `log/disable`
  - All log functions include newlines and are disabled with a single flag
  - OutputQueue architecture allows builtins to emit OutputTokens with specific OutputHandles
- **Browser Terminal UI**: Added visual multi-window terminal interface for browser processes (2025-10-16)
  - Draggable, resizable terminal windows for each process
  - Window titles show PID and parent PID
  - Mailbox indicator (📬) shows when messages are waiting
  - Terminated processes turn red and can be closed
  - Command history with up/down arrow keys
  - Smart window positioning (right or below parent)
  - Spawned windows start smaller (450x300) vs main (600x450)
- **Error Handling**: Added `try/catch` and `throw` for exception handling (2025-10-16)
  - `try` blocks execute expressions and catch errors
  - `catch` blocks receive error objects with `message` and `type` fields accessible via dot notation
  - `throw` can throw strings or error objects
  - Supports nested try/catch, re-throwing, and multiple expressions in both blocks
- **Mutation**: Added `set!` special form for variable mutation (2025-10-16)
  - Mutates existing variables in local or global scope
  - Searches local scope first, then global bindings
  - Errors if variable doesn't exist (safe by default)
  - Works with function parameters and let-bound variables
- **Sequencing**: Added `begin` special form for sequential evaluation (2025-10-16)
  - Evaluates multiple expressions in sequence
  - Returns the value of the last expression
  - Essential for using `set!` and side effects in single-expression contexts
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