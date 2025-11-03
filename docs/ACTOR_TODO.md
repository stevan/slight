# Actor Library - Next Session TODO

## What Works ✅

- **Class inheritance in spawned processes** - Fixed! Classes are now copied to child processes
- **Instance creation in child processes** - `(object/new "Counter" 10)` works in spawned processes
- **Method calls** - `(method/call instance "get-value")` works correctly
- **Basic actor message passing** - Single message/response works

## What Doesn't Work ❌

1. **Actor loop exits after first message** - Process completes instead of continuing loop
2. **No variadic function syntax** - Slight doesn't support `(def f (a . rest))` syntax
3. **Actor library uses numbered functions** - `actor/new-1`, `call-0`, etc. - ugly API

## Root Cause

The recursive `(loop)` call at the end of the actor loop function doesn't continue execution.
The function returns instead of looping forever.

**Suspect**: Tail call optimization issue or closure scope problem with recursive named functions.

## Next Session Task

**Fix the actor message loop to continue indefinitely.**

### Test Case

```lisp
(class Counter (count)
  (init (n) (set! count n))
  (method get-value () count)
  (method increment () (set! count (+ count 1)) count))

(def actor-pid (actor/new-1 "Counter" 10))
(call-0 actor-pid "get-value")  ; Works - returns 10
(call-0 actor-pid "increment")   ; FAILS - process already exited
```

### Investigation Steps

1. Test if simple recursive loop works in spawned process:
   ```lisp
   (def loop-test (fun ()
     (begin
       (def loop (fun ()
         (begin
           (def msg (recv))
           (say msg)
           (loop))))  ; Does this continue?
       (loop))))
   ```

2. If loops don't work, try iterative approach with `while` (if it exists) or timer-based polling

3. Alternative: Spawn a new process for each message (stateless actors)

### Possible Solutions

**A)** Fix tail recursion in interpreter
**B)** Add `while` loop construct
**C)** Redesign actors without recursive loops
**D)** Use timer-based polling instead of recursion

## Files to Check

- `src/Slight/AST.ts` - Function evaluation (FunNode, CallNode)
- `src/Slight/CoreInterpreter.ts` - How functions are called
- `lib/Actor.sl` - Current implementation
- `t/013-actors.sl` - Test suite

## Success Criteria

- Actor responds to multiple messages without exiting
- All tests in `t/013-actors.sl` pass
- Clean API (ideally with variadic support in future)
