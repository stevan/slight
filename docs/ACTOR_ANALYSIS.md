# Actor Library Analysis

## Current Implementation

The Actor library (`lib/Actor.sl.WIP`) attempts to wrap OO classes in processes for concurrent message-passing actors.

### How It's Supposed to Work

```lisp
(class Counter (count)
  (init (n) (set! count n))
  (method increment () (set! count (+ count 1)) count))

(def c (actor/new "Counter" 0))
(call c :increment)  ; => 1
```

The actor/new function:
1. Spawns a process with `__actor-loop__`
2. Inside the process, creates an instance: `(object/new "Counter" 0)`
3. Enters message loop waiting for method calls
4. Dispatches methods using `method/call`

## The Fundamental Problem

**Classes are NOT inherited by spawned processes!**

### Evidence

In `ProcessRuntime.ts`, the `ParentState` interface (lines 52-56):

```typescript
export interface ParentState {
    functions: Map<string, any>;
    macros: Map<string, any>;
    bindings: Map<string, any>;
}
```

Notice: **NO classes field!**

When spawn creates a child process (lines 112-117):

```typescript
if (parentState) {
    slight.interpreter.parentFunctions = parentState.functions;
    slight.interpreter.parentMacros = parentState.macros;
    slight.interpreter.parentBindings = parentState.bindings;
    // Classes are NOT copied!
}
```

### What Happens

1. Parent process defines Counter class using `(class Counter ...)`
2. Class stored in `interpreter.classes` Map
3. `actor/new` spawns a process
4. Spawned process tries `(object/new "Counter" 0)`
5. **Fails!** Spawned process has no Counter class definition
6. Process crashes immediately

## Solution: Add Classes to Copy-on-Write State

To fix this, we need to make classes inherit-able like functions and macros.

### Implementation Plan

#### 1. Update ParentState Interface

**File**: `src/Slight/ProcessRuntime.ts`

```typescript
export interface ParentState {
    functions: Map<string, any>;
    macros: Map<string, any>;
    bindings: Map<string, any>;
    classes: Map<string, any>;  // ADD THIS
}
```

#### 2. Add Parent Classes to CoreInterpreter

**File**: `src/Slight/CoreInterpreter.ts`

Add field (around line 60 with other parent fields):

```typescript
public parentClasses?: Map<string, {
    slots: string[],
    methods: Map<string, { params: string[], body: ASTNode }>,
    init?: { params: string[], body: ASTNode }
}>;
```

#### 3. Update Class Lookup Methods

**File**: `src/Slight/CoreInterpreter.ts`

Update `registerClass` to check if class exists in parent:

```typescript
public registerClass(name: string, classDef: ...) {
    // Check if already defined in parent
    if (this.parentClasses?.has(name)) {
        // Could warn or allow override
    }
    this.classes.set(name, classDef);
}
```

Update `createInstance` to check parent classes:

```typescript
public async createInstance(className: string, args: any[]): Promise<any> {
    let classDef = this.classes.get(className);

    // Check parent classes if not found locally
    if (!classDef && this.parentClasses) {
        classDef = this.parentClasses.get(className);
    }

    if (!classDef) {
        throw new Error(`Class ${className} not defined`);
    }

    // ... rest of implementation
}
```

#### 4. Update Spawn to Pass Classes

**File**: `src/Slight/ProcessRuntime.ts`

Update spawn method (around line 112):

```typescript
if (parentState) {
    slight.interpreter.parentFunctions = parentState.functions;
    slight.interpreter.parentMacros = parentState.macros;
    slight.interpreter.parentBindings = parentState.bindings;
    slight.interpreter.parentClasses = parentState.classes;  // ADD THIS
}
```

#### 5. Update process/spawn Builtin

**File**: `src/Slight/CoreInterpreter.ts`

Update the spawn builtin to include classes in parent state (around line 651):

```typescript
this.builtins.set('process/spawn', async (fnOrSymbol: any, ...args: any[]) => {
    // ... existing code ...

    const parentState = {
        functions: this.functions,
        macros: this.macros,
        bindings: this.bindings,
        classes: this.classes  // ADD THIS
    };

    return await this.processRuntime.spawn(code, parentState);
});
```

## Testing Plan

After implementing these changes:

1. Rename `lib/Actor.sl.WIP` → `lib/Actor.sl`
2. Rename `t/013-actors.sl.WIP` → `t/013-actors.sl`
3. Run: `npm run build && node js/bin/slight.js -I lib/ t/013-actors.sl`
4. Should see: All actor tests pass

## Alternative Approaches (Not Recommended)

### Alternative 1: Pass Class Definition as Data
- Serialize class definition and pass it in spawn
- Complex, brittle, defeats purpose of OO system

### Alternative 2: Create Instance Before Spawning
- Pass instance instead of class name
- Doesn't work - instances can't be serialized/cloned properly
- Method closures reference parent interpreter

### Alternative 3: Different Actor Pattern
- Don't use classes at all
- Use plain functions/closures for actor state
- Loses benefits of OO abstraction

## Recommendation

**Implement Solution 1**: Add classes to copy-on-write state.

**Why?**
- Consistent with existing design (functions, macros, bindings already work this way)
- Minimal code changes
- Zero performance overhead (classes already in memory)
- Maintains OO abstraction benefits
- Enables powerful patterns (actors, concurrent objects, etc.)

**Complexity**: Low - just 5 small changes following existing patterns

**Benefits**:
- Makes the Actor library work
- Enables any class-based code in processes
- Natural extension of copy-on-write model
