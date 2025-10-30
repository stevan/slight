# Message-Oriented Actor Design

## Status: DRAFT - Implementation Blocked

**Last Updated**: 2025-10-30

This design document explores adding an actor abstraction on top of Slight's OO classes and process primitives. Implementation is currently blocked by limitations in the `spawn` primitive.

## Overview

A syntactic sugar layer over Slight's existing `process/` primitives that provides an object-oriented actor pattern. Actors wrap OO class instances in processes, enabling concurrent message-passing.

## Implementation Blockers

### Current `spawn` Limitations

The `process/spawn` primitive (CoreInterpreter.ts:732-774) has critical limitations:

1. **No Anonymous Function Support** (line 760)
   ```typescript
   // Anonymous function or closure: we'll need to define it inline
   // For now, throw an error - we can't easily serialize the AST
   throw new Error('Cannot spawn anonymous function - pass a named function or use code string');
   ```

2. **No Closure Support**
   - Spawn only works with named functions or code strings
   - Cannot capture lexical environment in spawned processes
   - This breaks the natural pattern of wrapping classes in processes

### What Works vs What Doesn't

**✓ Works:**
```lisp
(def worker ()
  (begin
    (def msg (recv))
    (send (head msg) "response")))

(def pid (spawn worker))  ; Named function - works
```

**✗ Doesn't Work:**
```lisp
(def make-actor (class-name)
  (spawn
    (fun ()  ; Anonymous function - FAILS
      (begin
        (def instance (new class-name))
        ; ... message loop
        ))))

(def pid (make-actor "Counter"))
```

**✗ Also Doesn't Work:**
```lisp
(def actor-loop (class-name)
  (spawn
    (fun ()  ; Closure over class-name - FAILS
      (begin
        (def instance (new class-name))
        ; ... message loop
        ))))
```

### Attempted Solutions

1. **Named Function Approach** (lib/Actor.sl)
   - Define `__actor-loop__` as a global function
   - Pass class name and init args as arguments
   - Problem: `loop` is an inner closure that can't be spawned recursively

2. **Code String Generation**
   - Could generate code strings dynamically
   - Problem: Complex, error-prone, loses type safety

3. **Macro-based Code Generation**
   - Generate complete actor code at compile time
   - Problem: Still hits spawn limitations with generated closures

## Required Changes to Enable Actors

To implement actors, we need one of:

### Option A: Enhance `spawn` to Support Closures

**Changes needed in CoreInterpreter.ts:**
- Serialize AST of anonymous functions
- Capture and serialize lexical environment
- Reconstruct function with captured environment in new process

**Complexity**: High - requires AST serialization

### Option B: Add `spawn-code` Primitive

**New builtin that accepts code string:**
```lisp
(spawn-code "(begin (def x 10) (say x))")
```

Then build actors using string generation:
```lisp
(def actor/new (class-name . init-args)
  (spawn-code
    (string/concat
      "(begin "
      "  (def instance (object/new \"" class-name "\" " (serialize-args init-args) ")) "
      "  (def loop (fun () ... )) "
      "  (loop))")))
```

**Complexity**: Medium - but loses composability

### Option C: Add AST-based Spawn

**New primitive that accepts AST nodes:**
```lisp
(spawn-ast some-ast-node parent-env)
```

**Complexity**: Medium-High

### Option D: Simplify Actor Model

**Don't wrap classes - use map-based state instead:**
```lisp
(def actor/new (loop-fn init-state)
  (spawn loop-fn init-state))

(def counter-loop (state)
  (begin
    (def msg (recv))
    ; Handle message based on state
    (counter-loop new-state)))  ; Tail-recursive loop
```

**Complexity**: Low - but loses OO integration

## Revised Design (Given Current Limitations)

### Simplified Actor Syntax (OO-based)

Since we now have OO classes (as of 2025-10-30), the ideal syntax would be:

```lisp
; 1. Define a class normally
(class Counter (count)
  (init (n) (set! count n))
  (method increment () (set! count (+ count 1)) count)
  (method get-value () count))

; 2. Create actor from class
(def c (actor/new "Counter" 0))

; 3. Call methods via message passing
(call c :increment)   ; => 1
(call c :get-value)   ; => 1
```

**Implementation strategy:**
```lisp
(def __actor-loop__ (class-name . init-args)
  (begin
    (def instance (apply object/new (cons class-name init-args)))

    ; Message loop - but this is a problem because we can't define
    ; a closure here that calls itself recursively
    ; ...
    ))
```

**Problem**: The message loop needs to be recursive, but we can't define inner closures that call themselves.

## Core Syntax (Original Design - Pre-OO)

### Actor Definition

```lisp
(defactor <ActorName>
  :new <constructor-function>
  :on (<message-pattern> <handler-body>)
  :on (<message-pattern> <handler-body>)
  ...)
```

### Full Example

```lisp
(defactor Counter
  ; Constructor: creates initial state
  :new (fun (initial-value)
    (map/from-list
      (list (list :count initial-value))))

  ; Message handler: increment
  :on ((increment)
    (begin
      (map/set! this :count (+ (map/get this :count) 1))
      (map/get this :count)))

  ; Message handler: get current value
  :on ((get)
    (map/get this :count))

  ; Message handler: reset to zero
  :on ((reset)
    (begin
      (map/set! this :count 0)
      :ok)))

; Usage
(def counter (new Counter 0))
(call counter '(increment))  ; => 1
(call counter '(increment))  ; => 2
(call counter '(get))        ; => 2
(call counter '(reset))      ; => :ok
```

## Semantics

### What `defactor` Expands To

The `defactor` macro should expand to a constructor function that:
1. Creates initial state using `:new`
2. Spawns a process with a message loop
3. Returns the process PID

```lisp
; defactor Counter expands to approximately:
(def Counter
  (fun (initial-value)
    (spawn
      (fun ()
        (begin
          ; Initialize state
          (def this ((<new-function> initial-value)))

          ; Message loop
          (def actor-loop ()
            (begin
              (def msg (recv))
              (def sender (head msg))
              (def message-data (head (tail msg)))

              ; Dispatch to handlers
              (def result
                (cond
                  (<pattern-match-1> <handler-1>)
                  (<pattern-match-2> <handler-2>)
                  ...
                  (else :no-match)))

              ; Send reply
              (send sender result)

              ; Continue loop
              (actor-loop)))

          (actor-loop))))))

; new is just function application
(def new (fun (actor-constructor . args)
  (apply actor-constructor args)))
```

### What `call` Expands To

Synchronous request-response pattern:

```lisp
(def call (fun (actor-pid message)
  (begin
    (send actor-pid message)
    (head (tail (recv))))))
```

### What `cast` Could Provide

Asynchronous fire-and-forget (optional):

```lisp
(def cast (fun (actor-pid message)
  (send actor-pid message)))
```

## Message Patterns

### Simple Messages

```lisp
:on ((increment)
  ; Handler for '(increment)
  ...)

:on ((set-value x)
  ; Handler for '(set-value 42)
  ; x is bound to 42
  ...)
```

### Pattern Matching (Future Enhancement)

```lisp
:on ((add (x y))
  ; Handler for '(add (10 20))
  ; x=10, y=20
  (+ x y))

:on ((update :count value)
  ; Handler for '(update :count 100)
  ; Matches keyword :count
  ...)
```

## State Management

### The `this` Binding

Within message handlers, `this` refers to the current state of the actor. It's a lexically scoped variable available to all handlers.

```lisp
:on ((get-state)
  this)  ; Return entire state

:on ((update-field field value)
  (map/set! this field value))
```

### State Immutability vs Mutability

**Design Decision**: Use mutable state (maps with `map/set!`) for simplicity and performance.

- State is a Map stored in the actor's process
- Handlers mutate state in-place using `map/set!`
- State persists across message handling

**Alternative**: Immutable state (more functional, but more complex)
```lisp
; Would require returning new state from handlers
:on ((increment)
  (def new-state (map/set (map/create) :count
    (+ (map/get this :count) 1)))
  (set! this new-state)  ; Rebind this
  (map/get this :count))
```

**Decision**: Start with mutable maps, can add immutable option later.

## Implementation Plan

### Phase 1: Core Macro Implementation

1. **Implement `defactor` macro**
   - Parse actor definition syntax
   - Extract `:new` constructor
   - Extract `:on` message handlers
   - Generate message loop with pattern matching
   - Return constructor function

2. **Implement helper functions**
   - `new` - Actor instantiation (simple function application)
   - `call` - Synchronous message send
   - `cast` - Asynchronous message send (optional)

3. **Testing**
   - Create test actors (Counter, BankAccount)
   - Verify message passing works
   - Verify state persistence

### Phase 2: Pattern Matching Enhancement

1. **Simple pattern matching**
   - Match message shape `(command arg1 arg2 ...)`
   - Bind variables from message components
   - Support wildcard matching

2. **Guard clauses (optional)**
   ```lisp
   :on ((withdraw amount)
     :when (>= (map/get this :balance) amount)
     ...)
   ```

### Phase 3: Additional Features (If Needed)

1. **Lifecycle hooks**
   ```lisp
   :init (fun () ...)      ; Called after spawn
   :terminate (fun () ...) ; Called before exit
   ```

2. **Actor supervision** (separate library)
   - Restart strategies
   - Error handling
   - Link/monitor patterns

3. **Typed messages** (if type system added)
   ```lisp
   :on ((increment :number)
     ...)
   ```

## Example Use Cases

### Counter Actor

```lisp
(defactor Counter
  :new (fun (n) (map/from-list (list (list :count n))))

  :on ((increment)
    (begin
      (map/set! this :count (+ (map/get this :count) 1))
      (map/get this :count)))

  :on ((decrement)
    (begin
      (map/set! this :count (- (map/get this :count) 1))
      (map/get this :count)))

  :on ((get)
    (map/get this :count)))
```

### Bank Account Actor

```lisp
(defactor BankAccount
  :new (fun (owner balance)
    (map/from-list
      (list
        (list :owner owner)
        (list :balance balance)
        (list :transactions (list)))))

  :on ((deposit amount)
    (let ((new-balance (+ (map/get this :balance) amount)))
      (begin
        (map/set! this :balance new-balance)
        (map/set! this :transactions
          (cons (list :deposit amount)
                (map/get this :transactions)))
        (list :ok new-balance))))

  :on ((withdraw amount)
    (let ((balance (map/get this :balance)))
      (cond
        ((>= balance amount)
          (let ((new-balance (- balance amount)))
            (begin
              (map/set! this :balance new-balance)
              (map/set! this :transactions
                (cons (list :withdraw amount)
                      (map/get this :transactions)))
              (list :ok new-balance))))
        (else
          (list :error :insufficient-funds)))))

  :on ((get-balance)
    (map/get this :balance))

  :on ((get-transactions)
    (list/reverse (map/get this :transactions))))
```

### Chat Room Actor

```lisp
(defactor ChatRoom
  :new (fun (room-name)
    (map/from-list
      (list
        (list :name room-name)
        (list :members (list))
        (list :messages (list)))))

  :on ((join user-pid)
    (begin
      (map/set! this :members
        (cons user-pid (map/get this :members)))
      (list :ok (string/concat "Joined " (map/get this :name)))))

  :on ((leave user-pid)
    (begin
      (map/set! this :members
        (list/filter
          (fun (pid) (not (== pid user-pid)))
          (map/get this :members)))
      :ok))

  :on ((broadcast message)
    (begin
      (map/set! this :messages
        (cons message (map/get this :messages)))
      ; Send to all members
      (list/map
        (fun (member) (cast member (list :message message)))
        (map/get this :members))
      :ok))

  :on ((get-history)
    (list/reverse (map/get this :messages))))
```

## Open Questions

1. **Error Handling**: What happens if a handler throws an error?
   - Should it crash the actor?
   - Should we catch and reply with error tuple?
   - Should we have a catch-all handler?

2. **Default Handler**: What if no pattern matches?
   - Return `:no-match`?
   - Throw error?
   - Have optional `:else` clause?

3. **Multi-arity Messages**: How to handle?
   ```lisp
   :on ((compute x) ...)
   :on ((compute x y) ...)
   ```

4. **Nested Actors**: Can actors spawn other actors? (Yes, should work naturally)

5. **Actor Identity**: Should actors have names in addition to PIDs?
   ```lisp
   (def counter (new Counter 0 :name "my-counter"))
   ```

## Implementation Notes

### Macro Expansion Strategy

The `defactor` macro needs to:

1. Validate syntax
2. Extract components (`:new`, multiple `:on`)
3. Generate message dispatcher (cond expression)
4. Generate actor loop function
5. Return constructor that spawns process

### Helper Functions Location

Should these go in:
- **Option A**: Built into CoreInterpreter as builtins
- **Option B**: Library file (lib/Actor.sl)
- **Option C**: Mix - `call`/`cast` as builtins, `defactor` as macro in lib

**Recommendation**: Start with Option B (library) to keep interpreter clean, can move to builtins if performance matters.

### Testing Strategy

1. Unit tests for `defactor` macro expansion
2. Integration tests for actor messaging
3. Concurrent actor tests (multiple actors communicating)
4. Performance tests vs. raw process/ primitives

## Summary of Implementation Attempt (2025-10-30)

### What We Built

1. **OO Foundation** (✓ Complete)
   - Added `class`, `new`, method call syntax to interpreter
   - Full OO system with slots, methods, initialization
   - 18 passing tests in t/012-classes.sl

2. **Helper Builtins** (✓ Complete)
   - `object/new` - Dynamic object creation
   - `method/call` - Dynamic method dispatch
   - These enable runtime class instantiation and method invocation

3. **Actor Library Skeleton** (✗ Incomplete)
   - Created lib/Actor.sl with `actor/new`, `call`, `cast`
   - Implementation blocked by spawn limitations

### Key Learnings

1. **Spawn is code-string based**
   - Processes are spawned by serializing code as strings
   - Named functions work (serializes to `(function-name args)`)
   - Anonymous functions fail (no AST serialization)
   - Closures fail (no environment capture)

2. **Recursive loops are problematic**
   - Actor message loops need recursion
   - Can't define self-calling closures in spawned context
   - Would need tail-call optimization or trampolining

3. **OO + Actors needs careful design**
   - Simply wrapping class instances in processes isn't straightforward
   - Need to solve the spawn+closure problem first

### Next Steps

**Before implementing actors, we need to:**

1. **Decide on spawn enhancement strategy:**
   - Option A: Add AST serialization to spawn
   - Option B: Add spawn-code for string-based spawning
   - Option C: Simplify actors to not use closures
   - Option D: Defer actors until language has better metaprogramming

2. **Consider alternative patterns:**
   - Generic worker processes with dispatch tables
   - Macro-generated actor code (if spawn-code exists)
   - Manual actor implementation in user code (examples/patterns)

3. **Document working patterns:**
   - Show how to build stateful processes with current spawn
   - Demonstrate message passing with OO objects (non-actor)
   - Provide examples of process + class integration

**Recommendation**: Defer actor implementation until spawn supports closures, or pivot to a simpler actor model that works within current constraints.

## Original Design (Pre-Implementation)

Below is the original design document written before discovering the spawn limitations:

---

## Next Steps (Original)

1. Review and refine this design
2. Decide on open questions
3. Implement Phase 1 (core macro + helpers)
4. Create example actors and tests
5. Iterate based on usage patterns
