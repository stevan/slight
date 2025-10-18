# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Slight** is a LISP interpreter written in TypeScript using an async generator-based pipeline architecture. The codebase implements a complete programming language with lexical scoping, macros, and an Erlang-style process system.

## Development Commands

```bash
# Build the TypeScript code
npm run build

# Run the REPL
npm run repl

# Execute a Slight file
npm run slight program.sl
npm run slight -e "(+ 1 2)"
npm run slight -i lib/ program.sl

# Run all tests (27 test files)
npm test

# Run a specific test
tsc && node --test js/tests/030-Interpreter.test.js

# Build for browser
npm run build:browser
# Then serve with: npx http-server -p 8080
```

## Architecture Overview

### Pipeline Architecture
The interpreter uses composable async generators where each stage is independent:

```
Input → Tokenizer → Parser → MacroExpander → Interpreter → Output
```

- **Tokenizer** (`src/Slight/Tokenizer.ts`): Lexical analysis producing tokens
- **Parser** (`src/Slight/Parser.ts`): Builds AST from tokens, recognizes special forms
- **MacroExpander** (`src/Slight/MacroExpander.ts`): Compile-time macro expansion
- **Interpreter** (`src/Slight/Interpreter.ts` or `BrowserInterpreter.ts`): AST evaluation
- **Output** (`src/Slight/Outputs.ts`): Result formatting

### Interpreter Hierarchy
```
CoreInterpreter.ts (626 LOC)
├── Interpreter.ts (Node.js - adds fs/, sys/, include)
└── BrowserInterpreter.ts (Browser-safe)
```

The `CoreInterpreter` contains all platform-agnostic features and 150+ builtin functions. Platform-specific interpreters extend it with minimal code.

### AST System
All AST nodes (`src/Slight/AST.ts`) extend `ASTNode` and implement their own `evaluate()` method:
- **Literals**: NumberNode, StringNode, BooleanNode
- **Symbols**: SymbolNode (supports dot notation for object access)
- **Special Forms**: DefNode, LetNode, FunNode, CondNode, DefMacroNode, etc.

### Process System
`ProcessRuntime.ts` implements Erlang-style actors with:
- Isolated interpreter instances per process
- Message passing via AsyncQueue
- Works identically in Node.js and browser
- Browser UI shows each process in a separate window

## Key Implementation Details

### Adding New Builtin Functions
1. **Platform-agnostic**: Add to `CoreInterpreter.ts` in the constructor
2. **Node.js-specific**: Add to `Interpreter.ts` constructor
3. **Browser-specific**: Add to `BrowserInterpreter.ts` constructor

Example pattern:
```typescript
this.builtins.set('function-name', async (args) => {
    // Implementation
    return result;
});
```

### Testing Pattern
Tests use Node.js native test framework:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';

async function evaluate(code: string): Promise<any> {
    // Set up pipeline and evaluate
}

test('description', async () => {
    assert.strictEqual(await evaluate('(+ 1 2)'), 3);
});
```

### Error Handling
- **Pipeline errors**: Propagate through stages as `{ type: 'ERROR', stage, message }`
- **Runtime errors**: Use try/catch/throw special forms
- Each pipeline stage checks for and forwards pipeline errors

### Async Evaluation
All evaluation is Promise-based to support:
- Timer operations (sleep, timeout, interval)
- Network requests (fetch)
- Process scheduling
- File I/O (Node.js)

## Namespaced Standard Library

The interpreter organizes 150+ builtin functions into namespaces:

- **Core** (no namespace): `+`, `-`, `*`, `/`, `==`, `<`, `>`, `and`, `or`, `not`
- **math/**: 22 functions for arithmetic, trigonometry, rounding
- **string/**: 20 functions for manipulation, search, transform
- **list/**: 15+ functions including map, filter, reduce
- **map/**: 11 functions for dictionary operations
- **type/**: Type inspection and assertions
- **json/**: Parse and stringify with pretty-print
- **timer/**: Cross-platform timers and sleep
- **process/**: Spawn, send, recv, kill for actor model
- **fs/** (Node.js only): File operations
- **sys/** (Node.js only): System operations

Legacy aliases exist for backward compatibility (e.g., `head` → `list/head`).

## Special Forms

Special forms have custom evaluation rules in their AST nodes:
- `def` - Define variables/functions
- `defmacro` - Define compile-time macros
- `let` - Lexical bindings with sequential evaluation
- `fun` - Anonymous functions with closure
- `cond` - Multi-branch conditionals
- `set!` - Variable mutation
- `try/catch/throw` - Exception handling

## Working with Processes

The process system (`ProcessRuntime.ts`) provides concurrent execution:
```lisp
(def worker (fun ()
  (begin
    (def msg (recv))
    (send (head msg) (* (head (tail msg)) 2)))))

(def pid (spawn worker))
(send pid 21)
(recv)  ; Returns [pid 42]
```

In the browser, each process appears in its own draggable window with visual status indicators.

## File Organization

- **Core interpreter logic**: `src/Slight/CoreInterpreter.ts`
- **AST definitions**: `src/Slight/AST.ts`
- **Platform-specific code**: `Interpreter.ts` (Node.js), `BrowserInterpreter.ts`
- **Tests**: `tests/` directory with 27 test files
- **Entry points**: `bin/slight.ts` (CLI), `src/browser.ts` (browser)
- **Browser UI**: `index.html` (multi-window terminal interface)

## Important Notes

- TypeScript strict mode is enabled throughout
- No external runtime dependencies (only dev dependencies)
- Browser and Node.js share ~95% of code through inheritance
- Macro expansion happens before interpretation as a separate pipeline stage
- All evaluation is async (Promise-based) to support I/O operations
- The pipeline architecture allows swapping/testing individual stages