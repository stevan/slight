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

# Run all tests (188 core tests)
npm test

# Run dependency injection tests (33 DI tests)
npm run build && node --test 'js/tests/dependencies/*.test.js' 'js/tests/integration/*.test.js'

# Run a specific test
tsc && node --test js/tests/030-Interpreter.test.js

# Benchmarking and profiling
npm run bench              # Pipeline overhead benchmark
npm run bench:memory       # Memory usage analysis
npm run bench:process      # Process system performance
npm run profile:cpu        # Generate CPU profile
npm run profile:heap       # Generate heap snapshot
npm run profile:inspect    # Debug with Chrome DevTools

# Build for browser
npm run build:browser
# Then serve with: npx http-server -p 8080
```

## Performance & Profiling

### Benchmarking
Three benchmark suites are available in `benchmarks/`:

1. **Pipeline Overhead** (`pipeline-overhead.ts`): Measures async generator pipeline overhead
   - Full pipeline vs direct AST evaluation
   - Individual stage performance (Tokenizer, Parser, MacroExpander, Interpreter)
   - ~0.012ms per expression through full pipeline (~20x overhead vs direct eval)

2. **Memory Usage** (`memory-usage.ts`): Tracks heap allocations and GC patterns
   - Interpreter reuse saves ~80% memory
   - Minimal heap growth (~0.3MB over 1000 iterations)

3. **Process System** (`process-system.ts`): Comprehensive process performance analysis
   - Process spawning with various state sizes
   - Message passing throughput (250K+ messages/sec)
   - Concurrent process scaling (linear scaling up to 1000+ processes)
   - Memory overhead per process (~0.16 KB)

### Profiling Guide
See `docs/PROFILING.md` for detailed profiling instructions including:
- Node.js CPU profiler usage
- Chrome DevTools integration
- Clinic.js for advanced diagnostics
- Memory profiling techniques
- Optimization strategies
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
- Copy-on-write environment sharing (zero-cost state inheritance)
- Works identically in Node.js and browser
- Browser UI shows each process in a separate window

**Performance characteristics:**
- Process spawn: ~0.018ms (55K+ spawns/sec)
- Message passing: 250K+ messages/sec
- Memory: ~0.16 KB per process
- Scaling: Linear up to 1000+ concurrent processes

**Copy-on-Write Optimization:**
Child processes inherit parent state by reference, not by cloning. Reads check local environment first, then fall back to parent. Writes always go to local environment, preserving isolation. This eliminates the cost of cloning large environments (41x speedup for 200-item environments).

## Key Implementation Details

### Copy-on-Write Environment Inheritance
The interpreter uses a prototype chain for process environments:

**CoreInterpreter fields:**
```typescript
// Local environment (writes go here)
public functions: Map<string, { params: string[], body: ASTNode }>;
public macros: Map<string, { params: string[], body: ASTNode }>;
public bindings: Map<string, any>;

// Parent environment references (reads fall back here)
public parentFunctions?: Map<...>;
public parentMacros?: Map<...>;
public parentBindings?: Map<...>;
```

**Lookup methods** (in `CoreInterpreter.ts`):
- `hasFunction(name)`, `getFunction(name)`: Check local first, then parent
- `hasMacro(name)`, `getMacro(name)`: Check local first, then parent
- `hasBinding(name)`, `getBinding(name)`: Check local first, then parent

**AST nodes** (`src/Slight/AST.ts`) use these helpers instead of direct Map access:
- `SymbolNode`: Uses `interpreter.hasBinding()` and `interpreter.getBinding()`
- `CallNode`: Uses helpers for method calls with dot notation
- `SetNode`: Uses `interpreter.hasBinding()` for existence check, writes to local

**ProcessRuntime** (`src/Slight/ProcessRuntime.ts:112-116`):
Sets parent references instead of cloning Maps when spawning with state.

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

### Dependency Injection

Slight uses dependency injection to make I/O operations mockable and support multiple platforms:

**Architecture:**
```typescript
CoreInterpreter
├── OutputSink - Where print/say/log output goes
├── ProcessRuntime - Manages actor-style processes
└── PlatformOperations - Platform-specific I/O (fs, sys, net, timer)
```

**Default behavior (backward compatible):**
```typescript
const interpreter = new CoreInterpreter();
// Uses: QueueOutputSink, ProcessRuntime singleton, NodePlatform
```

**Testing with mocks:**
```typescript
import { CoreInterpreter, CollectingOutputSink, MockPlatform } from './Slight/Dependencies/index.js';

const sink = new CollectingOutputSink();
const platform = new MockPlatform();
platform.setFile('/config.json', '{"key": "value"}');
platform.setEnv('API_KEY', 'test-key');

const interpreter = new CoreInterpreter({
    outputSink: sink,
    platform: platform
});

// Run code and verify behavior
await evaluate(interpreter, '(say "Hello")');
assert.equal(sink.getStdout()[0], 'Hello\n');

await evaluate(interpreter, '(fs/read "/config.json")');
// Reads from mock filesystem, not real disk
```

**Available platforms:**
- `NodePlatform` - Full Node.js (fs, sys, net, timer)
- `BrowserPlatform` - Browser-safe (net, timer only)
- `MockPlatform` - In-memory mocks for testing

**Available output sinks:**
- `QueueOutputSink` - Default (pushes to outputQueue for pipeline)
- `CollectingOutputSink` - Captures all output for testing
- `ConsoleOutputSink` - Direct to console (bypasses pipeline)

See `tests/integration/dependency-injection.test.ts` for comprehensive examples.

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