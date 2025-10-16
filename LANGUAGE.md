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
; This is a comment (not currently supported in the language)

42              ; Number
"hello"         ; String
true            ; Boolean
x               ; Symbol
(+ 1 2)         ; List (function call)
(list 1 2 3)    ; List (data)
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
(when (> x 5) (print "big"))
; Expands to: (cond ((> x 5) (print "big")))

; Define an 'unless' macro
(defmacro unless (test body)
  (list (quote cond) (list (list (quote not) test) body)))

; Usage
(unless (< x 0) (print "positive"))
; Expands to: (cond ((not (< x 0)) (print "positive")))

; Macros receive unevaluated arguments
(defmacro add2 (x)
  (list (quote +) x 2))

(add2 5)  ; Expands to: (+ 5 2), returns 7
```

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

1. **No Comments** - The tokenizer doesn't support comment syntax
2. **No Variadic Functions** - Functions must have fixed arity
3. **No Tail Call Optimization** - Deep recursion may stack overflow
4. **Limited Mutability** - Only Maps are mutable
5. **No Module System** - Use naming conventions for namespaces
6. **No Quasiquote/Unquote** - Macro writing is more verbose
7. **No Error Handling** - No try/catch mechanism

## Best Practices

1. **Use `fun` for anonymous functions** - More flexible than nested `def`
2. **Use `let` for local bindings** - Cleaner than nested `def`
3. **Prefer immutability** - Use Maps only when mutation is necessary
4. **Name predicates with `?`** - e.g., `empty?`, `even?`
5. **Name mutating functions with `!`** - e.g., `map-set!`, `delete-file!`
6. **Use higher-order functions** - `map`, `filter`, `compose` for cleaner code
7. **Organize with files** - Use `include` to split large programs