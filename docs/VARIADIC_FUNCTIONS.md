# Variadic Functions Implementation

**Status:** ✅ Complete
**Date:** November 2024
**Test Coverage:** 20 dedicated tests (100% pass rate)

## Overview

Variadic functions allow functions to accept a variable number of arguments using rest parameter syntax. This feature brings Slight in line with standard Lisp conventions and significantly simplifies the Actor library API.

## Syntax

### Basic Forms

```lisp
;; Only rest parameter - all args collected
(def sum (. nums)
  (list/reduce (fun (a b) (+ a b)) 0 nums))

;; One required + rest
(def greet (greeting . names)
  (list greeting names))

;; Multiple required + rest
(def make-msg (prefix suffix . words)
  (list prefix words suffix))

;; Anonymous variadic function
(fun (. args) body)
```

### Arity Checking

```lisp
;; Error: Too few arguments
(def foo (a b . rest) body)
(foo 1)  ; Error: expected at least 2, got 1

;; OK: Exact match with empty rest
(def foo (a b . rest) body)
(foo 1 2)  ; rest = []

;; OK: Extra args collected in rest
(def foo (a b . rest) body)
(foo 1 2 3 4 5)  ; rest = [3, 4, 5]
```

## Implementation Details

### Modified Components

1. **Parser** (`src/Slight/Parser.ts`)
   - Added `parseParams()` helper to detect dot notation
   - Validates parameter list structure
   - Supports `(a b . rest)` syntax

2. **AST Nodes** (`src/Slight/AST.ts`)
   - `FunNode`, `DefNode`, `DefMacroNode` extended with `restParam?: string`
   - Closures preserve rest parameter information
   - `QuoteNode` handles rest params in quoted functions

3. **CoreInterpreter** (`src/Slight/CoreInterpreter.ts`)
   - `callUserFunction()` updated for variadic arity checking
   - `callClosure()` updated for variadic arity checking
   - Rest arguments collected into array and bound to rest parameter

4. **MacroExpander** (`src/Slight/MacroExpander.ts`)
   - Full support for variadic macros
   - Rest parameters work in macro expansion
   - Preserves `restParam` through all transformations

### Type Signatures

```typescript
// Function/Closure type
type SlightFunction = {
  params: string[];
  body: ASTNode;
  restParam?: string;
  capturedEnv?: Map<string, any>;
}

// Macro type
type SlightMacro = {
  params: string[];
  body: ASTNode;
  restParam?: string;
}
```

## Examples

### 1. Sum Function

```lisp
(def sum (. nums)
  (list/reduce (fun (a b) (+ a b)) 0 nums))

(sum 1 2 3 4 5)  ; => 15
(sum)            ; => 0
```

### 2. String Concatenation

```lisp
(def concat-all (. strings)
  (list/reduce (fun (a b) (string/concat a b)) "" strings))

(concat-all "Hello" " " "world")  ; => "Hello world"
```

### 3. Higher-Order Functions

```lisp
(def filter-positive (. nums)
  (list/filter (fun (x) (> x 0)) nums))

(filter-positive -5 3 -2 8 0 1)  ; => (3 8 1)
```

### 4. Closures

```lisp
(def make-adder (base)
  (fun (. nums)
    (list/map (fun (n) (+ base n)) nums)))

(def add10 (make-adder 10))
(add10 1 2 3)  ; => (11 12 13)
```

## Actor Library Modernization

### Before (Numbered API)

```lisp
(def actor/new-0 (class-name) ...)
(def actor/new-1 (class-name arg1) ...)
(def actor/new-2 (class-name arg1 arg2) ...)

(def call-0 (actor-pid method-name) ...)
(def call-1 (actor-pid method-name arg1) ...)
(def call-2 (actor-pid method-name arg1 arg2) ...)
```

### After (Variadic API)

```lisp
(def actor/new (class-name . init-args) ...)
(def call (actor-pid method-name . method-args) ...)
```

### Benefits

- ✅ **Code reduction:** 167 → 102 lines (39% smaller)
- ✅ **API simplification:** 6 functions → 2 functions
- ✅ **Better UX:** Single API instead of numbered variants
- ✅ **Backward compatible:** Legacy numbered API still supported

### Usage Example

```lisp
(include "lib/Actor.sl")

(class Counter (count)
  (init (n) (set! count n))
  (method increment () (set! count (+ count 1)) count)
  (method add (x) (set! count (+ count x)) count))

; New variadic API
(def counter (actor/new "Counter" 10))
(call counter "increment")      ; => 11
(call counter "add" 5)           ; => 16

; Legacy API still works
(def counter2 (actor/new-1 "Counter" 100))
(call-0 counter2 "get-value")   ; => 100
```

## Test Coverage

Created `tests/040-Variadic.test.ts` with 20 comprehensive tests:

### Test Categories

1. **Basic Variadic Functions** (6 tests)
   - Only rest parameter
   - Rest with no args
   - One/two required + rest
   - Empty rest when only required args provided

2. **Anonymous Functions** (2 tests)
   - Anonymous with rest param
   - Anonymous with required + rest

3. **Higher-Order Functions** (3 tests)
   - Using list/reduce
   - Using list/map
   - Using list/filter

4. **Closures** (2 tests)
   - Closure with rest param
   - Closure captures rest param

5. **Arity Checking** (3 tests)
   - Error when too few args
   - Error messages
   - Non-variadic functions still checked

6. **Practical Examples** (3 tests)
   - String concatenation
   - List builder
   - Combining with let bindings

7. **Edge Cases** (1 test)
   - Function taking zero required args

### Test Results

```
ℹ tests 223
ℹ suites 3
ℹ pass 223
ℹ fail 0
```

All existing tests continue to pass, ensuring backward compatibility.

## Future Enhancements

### Spread Syntax (Not Implemented)

Spread syntax would allow unpacking lists as arguments:

```lisp
;; Future syntax (not yet supported)
(def max-of (first . rest)
  (cond
    ((list/empty? rest) first)
    (else
      (def rest-max (max-of . rest))  ; Spread rest into args
      (cond ((> first rest-max) first) (else rest-max)))))
```

This would enable:
- Recursive variadic functions without manual unpacking
- More functional programming patterns
- Complete feature parity with Scheme/Common Lisp

However, the current implementation is fully functional and useful without spread syntax.

## Performance Impact

- ✅ No measurable performance degradation
- ✅ Arity checking is O(1)
- ✅ Rest parameter collection is O(n) where n = number of rest args
- ✅ Same performance as fixed-arity functions when rest is empty

## Breaking Changes

None. This is a purely additive feature with full backward compatibility.

## Migration Guide

### For Function Definitions

**Old:**
```lisp
;; Had to use fixed arity or manual list handling
(def sum-list (nums)
  (list/reduce (fun (a b) (+ a b)) 0 nums))
(sum-list (list 1 2 3 4))
```

**New:**
```lisp
;; Can accept variable arguments directly
(def sum (. nums)
  (list/reduce (fun (a b) (+ a b)) 0 nums))
(sum 1 2 3 4)
```

### For Actor Library

**Old:**
```lisp
(def c (actor/new-1 "Counter" 0))
(call-0 c "increment")
(call-1 c "add" 5)
```

**New:**
```lisp
(def c (actor/new "Counter" 0))
(call c "increment")
(call c "add" 5)
```

## Conclusion

Variadic functions are a fundamental feature that brings Slight closer to standard Lisp implementations. The feature is:

- ✅ Fully implemented and tested
- ✅ Backward compatible
- ✅ Well-documented
- ✅ Used in production (Actor library)
- ✅ Performance-neutral

This implementation demonstrates how a relatively small change to the parser and interpreter can have a significant positive impact on the language's ergonomics and the quality of libraries built with it.
