# Slight Language Reference

Slight is a minimal LISP dialect with lexical scoping, first-class functions, and closures.

## Table of Contents

1. [Basic Syntax](#basic-syntax)
2. [Data Types](#data-types)
3. [Special Forms](#special-forms)
4. [Built-in Functions](#built-in-functions)
5. [Advanced Features](#advanced-features)
6. [Examples](#examples)

## Basic Syntax

Slight uses S-expressions (symbolic expressions) where everything is either an atom or a list:

```lisp
; This is a comment

42              ; Number
"hello"         ; String
true            ; Boolean
x               ; Symbol
(+ 1 2)         ; List (function call)
(list 1 2 3)    ; List (data)
```

### Comments

Comments start with a semicolon `;` and extend to the end of the line:

```lisp
; Full-line comment
(+ 1 2)  ; Inline comment after code

; Multiple lines require semicolon on each line
; Like this
; And this
```

## Data Types

### Numbers

Integers and floating-point numbers:

```lisp
42
-17
3.14
-2.5
```

### Strings

Double-quoted text:

```lisp
"Hello, World!"
"Line 1\nLine 2"
```

### Booleans

```lisp
true
false
```

### Lists

Ordered collections:

```lisp
(list 1 2 3)
(list "a" "b" "c")
(list true false true)
```

### Maps

Key-value collections (mutable):

```lisp
(def m (make-map))
(map-set! m "key" "value")
(map-get m "key")  ; Returns "value"
```

### Functions

First-class values that can be passed and returned:

```lisp
(fun (x) (* x 2))           ; Anonymous function
(def double (x) (* x 2))    ; Named function
```

## Special Forms

Special forms have custom evaluation rules and are fundamental to the language.

### `def` - Define Variables and Functions

```lisp
; Define a variable
(def x 10)

; Define a function
(def add (a b)
  (+ a b))

; Functions return their last expression
(def calculate (x)
  (def temp (* x 2))  ; Local definition
  (+ temp 1))         ; Return value
```

### `fun` - Anonymous Functions

Create functions without names:

```lisp
; Anonymous function
(fun (x) (* x 2))

; Immediately invoked
((fun (x y) (+ x y)) 10 20)  ; Returns 30

; Stored in variable
(def double (fun (x) (* x 2)))

; Passed as argument
(map (fun (x) (* x x)) (list 1 2 3))  ; Returns (1 4 9)
```

### `let` - Local Bindings

Create local variables with lexical scope:

```lisp
(let ((x 10)
      (y 20))
  (+ x y))  ; Returns 30

; Sequential evaluation - later bindings can use earlier ones
(let ((x 10)
      (y (* x 2)))
  y)  ; Returns 20

; Shadowing outer bindings
(def x 100)
(let ((x 10))
  x)  ; Returns 10
x    ; Still 100
```

### `cond` - Conditional Expressions

Multi-branch conditionals:

```lisp
(cond
  ((< x 0) "negative")
  ((> x 0) "positive")
  (else "zero"))

; No else clause returns false if no condition matches
(cond
  ((> x 100) "big")
  ((> x 50) "medium"))  ; Returns false if x <= 50
```

### `quote` - Treat as Data

Prevent evaluation:

```lisp
(quote (+ 1 2))    ; Returns the list (+ 1 2), not 3
(quote x)          ; Returns the symbol x, not its value
```

### `defmacro` - Define Macros

Create compile-time code transformations:

```lisp
; Define a 'when' macro
(defmacro when (test body)
  (list (quote cond) (list test body)))

; Usage
(when (> x 5) (say "big"))
; Expands to: (cond ((> x 5) (say "big")))

; Define an 'unless' macro
(defmacro unless (test body)
  (list (quote cond) (list (list (quote not) test) body)))

; Usage
(unless (< x 0) (say "positive"))
; Expands to: (cond ((not (< x 0)) (say "positive")))

; Macros receive unevaluated arguments
(defmacro add2 (x)
  (list (quote +) x 2))

(add2 5)  ; Expands to: (+ 5 2), returns 7
```

### `begin` - Sequential Evaluation

Evaluate multiple expressions in sequence:

```lisp
; Multiple side effects
(begin
  (say "First")
  (say "Second")
  42)  ; Returns 42

; With variable mutation
(def x 10)
(begin
  (set! x 20)
  (set! x 30)
  x)  ; Returns 30

; In function body
(def update-counter (c)
  (begin
    (set! c (+ c 1))
    (say "Counter:" c)
    c))
```

### `set!` - Variable Mutation

Mutate existing variables:

```lisp
; Mutate global variable
(def x 10)
(set! x 20)
x  ; Returns 20

; Mutate local variable
(let ((y 5))
  (begin
    (set! y 99)
    y))  ; Returns 99

; Mutate function parameter
(def increment (x)
  (begin
    (set! x (+ x 1))
    x))
(increment 10)  ; Returns 11

; Error if undefined
(set! undefined-var 42)  ; Error: Cannot set! undefined variable
```

### `try`/`catch` - Error Handling

Handle exceptions gracefully:

```lisp
; Basic error catching
(try
  (throw "Something went wrong")
  (catch e
    (say e.message)
    "recovered"))  ; Returns "recovered"

; No error - returns try result
(try
  (+ 1 2)
  (catch e
    "error"))  ; Returns 3

; Access error details
(try
  (throw "Bad input")
  (catch e
    (begin
      (print e.type)     ; "Error"
      (print e.message)  ; "Bad input"
      false)))

; Nested try/catch
(try
  (try
    (throw "inner")
    (catch e1
      (throw "outer")))
  (catch e2
    e2.message))  ; Returns "outer"

; Re-throw errors
(try
  (try
    (throw "error")
    (catch e
      (throw e)))
  (catch e2
    "caught again"))

; In functions
(def safe-divide (a b)
  (try
    (/ a b)
    (catch e
      "division error")))
```

### `throw` - Throw Errors

Throw exceptions to be caught:

```lisp
; Throw string error
(throw "Error message")

; Conditional throwing
(def validate (x)
  (cond
    ((< x 0) (throw "negative value"))
    ((> x 100) (throw "value too large"))
    (else x)))

; Throw in expressions
(def risky-op (x)
  (try
    (cond
      ((== x 0) (throw "zero not allowed"))
      (else (/ 100 x)))
    (catch e
      -1)))

## Built-in Functions

### Arithmetic

```lisp
(+ 1 2 3)         ; Addition: 6
(- 10 3)          ; Subtraction: 7
(- 5)             ; Negation: -5
(* 2 3 4)         ; Multiplication: 24
(/ 10 2)          ; Division: 5
(mod 10 3)        ; Modulo: 1
```

### Comparison

```lisp
(== 1 1)          ; Equality: true
(!= 1 2)          ; Inequality: true
(< 1 2)           ; Less than: true
(> 2 1)           ; Greater than: true
(<= 2 2)          ; Less or equal: true
(>= 3 2)          ; Greater or equal: true
```

### Logic

```lisp
(and true true)   ; Logical AND: true
(or false true)   ; Logical OR: true
(not true)        ; Logical NOT: false
```

### Lists

```lisp
(list 1 2 3)                    ; Create: (1 2 3)
(head (list 1 2 3))             ; First element: 1
(tail (list 1 2 3))             ; Rest: (2 3)
(cons 0 (list 1 2))             ; Prepend: (0 1 2)
(empty? (list))                 ; Check empty: true
```

### Maps

```lisp
(def m (make-map))              ; Create new map
(map-set! m "key" 42)           ; Set key-value
(map-get m "key")               ; Get value: 42
(map-has? m "key")              ; Check key: true
(map-delete! m "key")           ; Remove key
(map-keys m)                    ; Get all keys
(map-values m)                  ; Get all values
(map-size m)                    ; Number of entries
```

### Files

```lisp
(read-file "input.txt")         ; Read file contents
(write-file! "output.txt" "data") ; Write to file
(file-exists? "test.txt")       ; Check existence
(delete-file! "temp.txt")       ; Delete file
(resolve-path "file.txt" "/base") ; Resolve path
(include "library.sl")          ; Load and execute file
```

### JSON

```lisp
(json-parse "{\"a\": 1}")       ; Parse JSON string
(json-stringify (list 1 2 3))   ; Convert to JSON
```

### System

```lisp
(get-env "PATH")                ; Get environment variable
(exit 0)                        ; Exit program
```

### I/O

Basic output functions for stdout:

```lisp
(print "Hello" "World")         ; Print without newline: Hello World
(say "Hello" "World")           ; Print with newline: Hello World\n
```

### Logging

Structured logging functions (all write to stderr with newlines):

```lisp
(log/info "Server started")     ; Informational messages (🌈 INFO)
(log/debug "Variable x =" 42)   ; Debug/diagnostic messages (💩 DEBUG)
(log/warn "Deprecated API")     ; Warnings (⚡️ WARN)
(log/error "Connection failed") ; Errors - logged, not thrown (💔 ERROR)

; Control logging output
(log/enable)                    ; Enable logging (default)
(log/disable)                   ; Disable all log/* output

; Alias
(warn "Warning message")        ; Alias to log/warn
```

**Notes:**
- `print` outputs without a newline, useful for building output incrementally
- `say` outputs with a newline, like `println` in other languages
- `log/*` functions are conditionally enabled via `log/enable`/`log/disable`
- `log/*` messages include emoji prefixes when using StandardError output
- `warn` is affected by `log/disable` since it's an alias to `log/warn`

### Processes

Erlang-style actor model for concurrent programming:

```lisp
; Spawn a new process (returns PID)
(def pid (spawn "(+ 1 2)"))

; Get current process ID
(self)  ; Returns 0 for main process

; Send a message to a process
(send pid 42)  ; Returns true

; Receive a message (with optional timeout in ms)
(recv)         ; Blocks until message arrives
(recv 1000)    ; Returns null if timeout expires

; Message format: [sender-pid data]
(def msg (recv 1000))
(head msg)          ; Sender PID
(head (tail msg))   ; Message data

; Check if process is running
(is-alive? pid)  ; Returns true or false

; Terminate a process
(kill pid)  ; Returns true if successful

; Get list of all process PIDs
(processes)  ; Returns list of PIDs
```

**Example: Echo Server**

```lisp
; Server receives a message and echoes it back
(def echo (spawn "(let ((msg (recv))) (send (head msg) (head (tail msg))))"))

; Send message to server
(send echo 42)

; Receive response
(def response (recv 1000))
(head (tail response))  ; Returns 42
```

**Example: Concurrent Fibonacci**

```lisp
(def fib (n)
  (cond
    ((< n 2) n)
    (else (+ (fib (- n 1)) (fib (- n 2))))))

; Calculate fibonacci in parallel
(def p1 (spawn "(def fib (n) (cond ((< n 2) n) (else (+ (fib (- n 1)) (fib (- n 2)))))) (send 0 (fib 10))"))
(def p2 (spawn "(def fib (n) (cond ((< n 2) n) (else (+ (fib (- n 1)) (fib (- n 2)))))) (send 0 (fib 8))"))

(def r1 (recv 5000))
(def r2 (recv 5000))
(+ (head (tail r1)) (head (tail r2)))  ; Returns 76 (55 + 21)
```

## Advanced Features

### Closures

Functions capture their lexical environment:

```lisp
(def make-adder (x)
  (fun (y) (+ x y)))

(def add5 (make-adder 5))
(add5 10)  ; Returns 15

; Counter with enclosed state
(def make-counter (init)
  (let ((count init))
    (fun () count)))  ; Captures 'count'
```

### Higher-Order Functions

Functions that operate on other functions:

```lisp
(def map (f lst)
  (cond
    ((empty? lst) (list))
    (else (cons (f (head lst))
                (map f (tail lst))))))

(def filter (pred lst)
  (cond
    ((empty? lst) (list))
    ((pred (head lst))
      (cons (head lst) (filter pred (tail lst))))
    (else (filter pred (tail lst)))))

(def compose (f g)
  (fun (x) (f (g x))))
```

### Recursion

Both direct and mutual recursion are supported:

```lisp
; Direct recursion
(def factorial (n)
  (cond
    ((== n 0) 1)
    (else (* n (factorial (- n 1))))))

; Mutual recursion
(def even? (n)
  (cond
    ((== n 0) true)
    (else (odd? (- n 1)))))

(def odd? (n)
  (cond
    ((== n 0) false)
    (else (even? (- n 1)))))
```

### Y Combinator

Anonymous recursion through the Y combinator:

```lisp
(def Y (fun (f)
  ((fun (x) (f (fun (y) ((x x) y))))
   (fun (x) (f (fun (y) ((x x) y)))))))

(def factorial
  (Y (fun (f)
       (fun (n)
         (cond
           ((== n 0) 1)
           (else (* n (f (- n 1)))))))))

(factorial 5)  ; Returns 120
```

### File Organization

Split code across multiple files:

```lisp
; math.sl
(def square (x) (* x x))
(def cube (x) (* x (* x x)))

; main.sl
(include "math.sl")
(square 5)  ; Returns 25
```

### Macros

Compile-time metaprogramming for creating new syntax:

```lisp
; Basic macro - when conditional
(defmacro when (test body)
  (list (quote cond) (list test body)))

(when (> x 10) (* x 2))  ; Expands at compile-time

; Macro for arithmetic shortcuts
(defmacro incr (x)
  (list (quote +) x 1))

(incr 5)  ; Returns 6

; Macro with multiple parameters
(defmacro swap (a b)
  (list (quote let)
        (list (list (quote temp) a))
        b
        (list (quote set!) a (quote temp))))

; Macros work with function definitions
(def process (x)
  (when (> x 0)
    (* x 2)))
```

## Examples

### QuickSort

```lisp
(def quicksort (lst)
  (cond
    ((empty? lst) (list))
    (else
      (let ((pivot (head lst))
            (rest (tail lst)))
        (let ((less (filter (fun (x) (<= x pivot)) rest))
              (greater (filter (fun (x) (> x pivot)) rest)))
          (append (quicksort less)
                  (cons pivot (quicksort greater))))))))

; Helper function
(def append (lst1 lst2)
  (cond
    ((empty? lst1) lst2)
    (else (cons (head lst1)
                (append (tail lst1) lst2)))))
```

### Memoization

```lisp
(def memoize (f)
  (let ((cache (make-map)))
    (fun (x)
      (cond
        ((map-has? cache x)
          (map-get cache x))
        (else
          (let ((result (f x)))
            (map-set! cache x result)
            result))))))

(def slow-fib (n)
  (cond
    ((< n 2) n)
    (else (+ (slow-fib (- n 1))
             (slow-fib (- n 2))))))

(def fast-fib (memoize slow-fib))
```

### Function Composition Pipeline

```lisp
(def pipe args
  (cond
    ((empty? args) (fun (x) x))
    ((empty? (tail args)) (head args))
    (else
      (let ((f (head args))
            (rest (apply pipe (tail args))))
        (fun (x) (rest (f x)))))))

(def add1 (fun (x) (+ x 1)))
(def times2 (fun (x) (* x 2)))
(def square (fun (x) (* x x)))

(def complex (pipe add1 times2 square))
(complex 3)  ; ((3 + 1) * 2)^2 = 64
```

## Language Limitations

1. **No Variadic Functions** - Functions must have fixed arity
2. **No Tail Call Optimization** - Deep recursion may stack overflow
3. **Limited Mutability** - Only variables (via `set!`) and Maps are mutable
4. **No Module System** - Use naming conventions for namespaces
5. **No Quasiquote/Unquote** - Macro writing is more verbose
6. **No Finally Clause** - Try/catch doesn't support cleanup blocks

## Best Practices

1. **Use `fun` for anonymous functions** - More flexible than nested `def`
2. **Use `let` for local bindings** - Cleaner than nested `def`
3. **Prefer immutability** - Use `set!` only when mutation is necessary
4. **Use `begin` for side effects** - Group multiple expressions with side effects
5. **Handle errors gracefully** - Use `try/catch` for operations that may fail
6. **Name predicates with `?`** - e.g., `empty?`, `even?`
7. **Name mutating functions with `!`** - e.g., `map-set!`, `set!`, `delete-file!`
8. **Use higher-order functions** - `map`, `filter`, `compose` for cleaner code
9. **Organize with files** - Use `include` to split large programs
10. **Validate inputs** - Use `throw` to signal invalid arguments early