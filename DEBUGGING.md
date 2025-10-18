# Debugging Guide for Slight

This document describes the debugging capabilities available in the Slight LISP interpreter.

## Current Debugging Features (Implemented)

### 1. Enhanced Error Messages with Location ✅

Errors now show exact line and column information:
```
💔 Error at line 4, column 6:
  Undefined symbol: z
```

This is achieved through:
- Location tracking in all tokens (line/column)
- AST nodes preserving location information
- Enhanced `SlightError` class hierarchy

### 2. Debug Mode ✅

Run the REPL with enhanced debugging features:
```bash
slight --debug
```

This enables the EnhancedREPL with special debugging commands.

### 3. REPL Debug Commands ✅

When running with `--debug`, the following commands are available:

```lisp
:ast (+ 1 2)        ; Show AST for expression
:tokens (+ 1 2)     ; Show tokens for expression
:expand (when ...)  ; Show macro expansion
:bindings           ; List all current bindings
:q                  ; Quit the REPL
```

### 4. Development Tools

The `DebugTools` class provides programmatic access:

```typescript
import { DebugTools } from './src/Slight/DebugTools.js';

const debug = new DebugTools();

// Show tokens
console.log(await debug.showTokens("(+ 1 2)"));

// Show AST
console.log(await debug.showAST("(+ 1 2)"));

// Show macro expansion
console.log(await debug.showMacroExpansion("(when true 42)"));
```

### 5. Testing Improvements

Better test output with context:

```typescript
test('my test', async () => {
    const code = "'(a b c)";
    const result = await evaluate(code);

    // If this fails, show:
    // - The code that was evaluated
    // - The tokens generated
    // - The AST produced
    // - The actual vs expected result
});
```

## Implementation Status

### Phase 1: Quick Wins ✅ COMPLETED
- [x] Add line/column to tokens
- [x] Enhance error messages with location
- [x] Add `:ast` and `:tokens` REPL commands
- [x] Create DebugTools module

### Phase 2: Core Debug Features - PARTIALLY COMPLETED
- [x] Implement `--debug` flag
- [x] Add environment inspection commands (`:bindings`)
- [ ] Create execution tracer
- [x] Add macro expansion viewer (`:expand`)

### Phase 3: Interactive Debugging (1-2 weeks)
- [ ] Breakpoint system
- [ ] Step debugger
- [ ] Watch expressions
- [ ] Call stack tracking

### Phase 4: Developer Ecosystem (ongoing)
- [ ] VSCode extension
- [ ] Language server protocol
- [ ] Documentation generator
- [ ] Performance profiler

## Implemented Classes and Architecture

### SlightError Class Hierarchy
Located in `src/Slight/SlightError.ts`:
- `SlightError` - Base class with location tracking
- `UndefinedSymbolError` - For undefined symbols
- `ArityError` - For function arity mismatches
- `TypeMismatchError` - For type errors
- `SyntaxError` - For syntax errors

### EnhancedREPL
Located in `src/Slight/EnhancedREPL.ts`:
- Extends base REPL with debug commands
- Handles `:ast`, `:tokens`, `:expand`, `:bindings`
- Activated via `--debug` flag

### DebugTools
Located in `src/Slight/DebugTools.ts`:
- Programmatic access to debugging features
- Used by EnhancedREPL internally

## Example: How Location Tracking Works

Here's how location tracking has been implemented:

1. **Update Token type** (Types.ts):
```typescript
export interface Token {
    type: TokenType;
    source: string;
    sequence_id: number;
    line?: number;
    column?: number;
}
```

2. **Track location in Tokenizer**:
```typescript
// Track line and column as we tokenize
let line = 1, column = 1;
// ... update as we process tokens
```

3. **Propagate location through AST**:
```typescript
export abstract class ASTNode {
    abstract type: string;
    location?: { line: number; column: number };
    // ...
}
```

4. **Include in error messages**:
```typescript
throw new SlightError(
    'Undefined symbol: foo',
    'Interpreter',
    node.location?.line,
    node.location?.column
);
```

## Using Debug Mode Today

While full debugging features are being implemented, you can use these techniques:

### 1. Add logging to your code:
```lisp
(def debug-add (a b)
  (begin
    (say "Adding:" a "+" b)
    (def result (+ a b))
    (say "Result:" result)
    result))
```

### 2. Use the test file for debugging:
```typescript
// tests/debug-quote.ts shows how to inspect pipeline stages
```

### 3. Modify the interpreter temporarily:
```typescript
// In CoreInterpreter.ts, add logging:
console.log('Evaluating:', node.type, node);
```

### 4. Use try/catch for error context:
```lisp
(try
  (risky-operation)
  (catch e
    (begin
      (say "Error occurred:" e)
      (say "Context:" current-data)
      (throw e))))
```

## Contributing

If you'd like to help improve debugging in Slight:

1. Pick a task from the roadmap
2. Create a feature branch
3. Implement with tests
4. Submit a PR

Priority areas:
- Location tracking (high impact, foundational)
- REPL commands (improves daily development)
- Error messages (helps all users)