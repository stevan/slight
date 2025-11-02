# Next Session: Implement TracingInterpreter

## Context

I'm working on the Slight LISP interpreter (TypeScript project at `/Users/stevan/Projects/typescript/001-LISPs/slight`).

We just completed a Dependency Injection refactoring that makes the interpreter highly extensible. Now I want to implement a **TracingInterpreter** as the first example of a DI plugin.

## What Has Been Done

1. ✅ Complete DI system implemented in `src/Slight/Dependencies/`
2. ✅ `CoreInterpreter` refactored to accept injected dependencies
3. ✅ Three platforms available: `NodePlatform`, `BrowserPlatform`, `MockPlatform`
4. ✅ Three output sinks: `QueueOutputSink`, `CollectingOutputSink`, `ConsoleOutputSink`
5. ✅ Comprehensive test suite (33 DI tests all passing)
6. ✅ Plugin guide written in `docs/DI_PLUGIN_GUIDE.md`

## What To Implement

Create a **TracingInterpreter** that logs all builtin function calls with:
- Call depth visualization (indentation)
- Argument and return value formatting
- Timing information (optional)
- Error tracking
- Trace log capture for analysis
- Configurable options (console output, max depth, timing, etc.)

## Implementation Specification

### File: `src/Slight/TracingInterpreter.ts`

The complete design is documented in `docs/DI_PLUGIN_GUIDE.md` (search for "Complete Example: Tracing/Debugging Interpreter").

**Key Features:**

1. **TraceEntry Interface:**
   ```typescript
   export interface TraceEntry {
       depth: number;
       timestamp: number;
       expr: string;
       result?: any;
       error?: string;
       duration?: number;
   }
   ```

2. **TracingOptions Interface:**
   ```typescript
   export interface TracingOptions {
       enableConsole?: boolean;      // Log to console in real-time
       captureResults?: boolean;      // Store results in trace log
       maxDepth?: number;             // Maximum trace depth
       includeTimings?: boolean;      // Include timing information
   }
   ```

3. **TracingInterpreter Class:**
   - Extends `CoreInterpreter`
   - Constructor accepts `InterpreterDependencies` and `TracingOptions`
   - Wraps all builtin functions to add tracing
   - Tracks call depth and timing
   - Formats values for readable output
   - Provides API for inspecting traces

4. **Public API Methods:**
   - `getTraceLog(): TraceEntry[]` - Get all trace entries
   - `clearTraceLog(): void` - Clear trace log
   - `getTraceStats()` - Get statistics (total calls, duration, errors, etc.)
   - `exportTraceAsJSON(): string` - Export trace as JSON
   - `printTraceSummary(): void` - Print human-readable summary

5. **Value Formatting:**
   - Strings: `"hello"` (truncate if > 50 chars)
   - Numbers: `42`
   - Booleans: `true` / `false`
   - Lists: `(1 2 3)` or `[list:10]` if > 3 items
   - Functions: `[function]` or `[closure]`
   - Objects: `[object]`

6. **Console Output Format:**
   ```
   → (factorial 5)
     → (* 5 (factorial 4))
       → (factorial 4)
         → (* 4 (factorial 3))
           ...
         ← 24 [2ms]
       ← 24 [2ms]
     ← 120 [5ms]
   ← 120 [5ms]
   ```

### File: `tests/tracing-interpreter.test.ts`

Write comprehensive tests for:
1. Basic call tracing
2. Depth tracking
3. Result capture
4. Error handling
5. Timing information
6. Max depth limiting
7. Console vs silent mode
8. Statistics generation
9. Nested function calls
10. Multiple interpreter instances

**Minimum 10 tests required.**

## Success Criteria

1. ✅ `TracingInterpreter` compiles without errors
2. ✅ All tests pass (at least 10 tests)
3. ✅ Can trace simple expressions: `(+ 1 2)`
4. ✅ Can trace nested calls: `(* 2 (+ 1 2))`
5. ✅ Can trace recursive functions: factorial, fibonacci
6. ✅ Options work correctly (console on/off, max depth, etc.)
7. ✅ Statistics are accurate
8. ✅ No performance regression on non-traced code

## Testing Examples

```typescript
// Example 1: Basic tracing
const interp = new TracingInterpreter();
await evaluate(interp, '(+ 1 2 3)');
// Should log: → (+ 1 2 3)
//              ← 6

// Example 2: Silent mode for analysis
const interp = new TracingInterpreter(undefined, {
    enableConsole: false,
    captureResults: true
});
await evaluate(interp, '(+ 1 2)');
const trace = interp.getTraceLog();
assert.equal(trace.length, 1);
assert.equal(trace[0].result, 3);

// Example 3: Recursive function
const interp = new TracingInterpreter();
await evaluate(interp, `
    (def factorial (fun (n)
        (cond
            ((<= n 1) 1)
            (else (* n (factorial (- n 1)))))))
    (factorial 5)
`);
interp.printTraceSummary();
// Should show nested calls with proper indentation

// Example 4: Max depth limit
const interp = new TracingInterpreter(undefined, { maxDepth: 3 });
await evaluate(interp, '(factorial 100)');
// Should only trace first 3 levels
```

## Implementation Steps

1. **Phase 1: Basic Structure**
   - Create `TracingInterpreter.ts` with class skeleton
   - Define interfaces (`TraceEntry`, `TracingOptions`)
   - Set up constructor with options

2. **Phase 2: Builtin Wrapping**
   - Implement `wrapAllBuiltins()` method
   - Implement `wrapBuiltin()` to intercept calls
   - Track depth and timing

3. **Phase 3: Value Formatting**
   - Implement `formatValue()` method
   - Handle all types correctly
   - Truncate long values

4. **Phase 4: Trace Management**
   - Implement `getTraceLog()`
   - Implement `clearTraceLog()`
   - Implement `getTraceStats()`

5. **Phase 5: Output & Analysis**
   - Implement console logging with indentation
   - Implement `printTraceSummary()`
   - Implement `exportTraceAsJSON()`

6. **Phase 6: Testing**
   - Write all 10+ tests
   - Test edge cases (errors, deep recursion, etc.)
   - Verify performance

7. **Phase 7: Documentation**
   - Add usage examples to comments
   - Update README if needed
   - Add example scripts

## Files to Reference

- **DI Plugin Guide**: `docs/DI_PLUGIN_GUIDE.md` - Contains complete implementation example
- **Core Interpreter**: `src/Slight/CoreInterpreter.ts` - Base class to extend
- **Dependency Types**: `src/Slight/Dependencies/types.ts` - Understand DI interfaces
- **Existing Tests**: `tests/integration/dependency-injection.test.ts` - Test patterns
- **Evaluation Helper**: See existing test files for `evaluate()` helper pattern

## Important Notes

1. **Don't modify CoreInterpreter** - TracingInterpreter should extend it without changing the base
2. **Use TypeScript strict mode** - All code must compile with strict type checking
3. **Follow existing patterns** - Look at how tests are structured in `tests/` directory
4. **Minimal overhead** - When tracing is disabled, performance should be near-native
5. **Composability** - Should work with any injected dependencies (MockPlatform, etc.)

## Verification Commands

```bash
# Build
npm run build

# Run tracing tests
tsc && node --test js/tests/tracing-interpreter.test.js

# Run all tests (should still pass)
npm test

# Try it manually
node -e "
const { TracingInterpreter } = require('./js/Slight/TracingInterpreter.js');
const interp = new TracingInterpreter();
// ... test code ...
"
```

## Expected Output Structure

After implementation, you should be able to run:

```typescript
const interp = new TracingInterpreter();
await evaluate(interp, `
    (def fib (fun (n)
        (cond
            ((< n 2) n)
            (else (+ (fib (- n 1)) (fib (- n 2)))))))
    (fib 5)
`);
interp.printTraceSummary();
```

And see output like:
```
→ (def fib ...)
← [closure]
→ (fib 5)
  → (< 5 2)
  ← false
  → (+ (fib 4) (fib 3))
    → (fib 4)
      ...
    ← 3
    → (fib 3)
      ...
    ← 2
  ← 5
← 5

=== Trace Summary ===
Total calls: 27
Total duration: 15ms
Errors: 0
Max depth: 6

Most called builtins:
  <: 15
  fib: 9
  +: 8
  -: 6
```

## Questions to Answer During Implementation

1. Should we trace user-defined functions separately from builtins?
2. How to handle very deep recursion (stack overflow prevention)?
3. Should trace log have a maximum size (memory management)?
4. Should we add filtering (trace only specific builtins)?
5. Should we support trace replay/debugging?

## Stretch Goals (if time permits)

- Add filtering by builtin name pattern
- Add breakpoint support (pause execution)
- Export trace in different formats (CSV, HTML)
- Add trace visualization (ASCII tree)
- Support conditional tracing (only trace when condition met)
- Add memory usage tracking per call

---

**Start by reading `docs/DI_PLUGIN_GUIDE.md` carefully, then implement the TracingInterpreter step by step, testing each phase before moving to the next.**
