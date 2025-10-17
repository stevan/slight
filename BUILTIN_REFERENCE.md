# Slight Builtin Function Reference

This document provides a comprehensive reference for all builtin functions in Slight, organized by namespace.

## Table of Contents
- [Core Operations](#core-operations)
- [Math Namespace](#math-namespace)
- [String Namespace](#string-namespace)
- [List Namespace](#list-namespace)
- [Map Namespace](#map-namespace)
- [Type Namespace](#type-namespace)
- [JSON Namespace](#json-namespace)
- [Log Namespace](#log-namespace)
- [Timer Namespace](#timer-namespace)
- [Network Namespace](#network-namespace)
- [Process Namespace](#process-namespace)
- [File System Namespace (Node.js)](#file-system-namespace-nodejs)
- [System Namespace (Node.js)](#system-namespace-nodejs)

---

## Core Operations

### Arithmetic
- `(+ n1 n2 ...)` - Addition (variadic)
- `(- n)` or `(- n1 n2 ...)` - Negation or subtraction
- `(* n1 n2 ...)` - Multiplication (variadic)
- `(/ n1 n2)` - Division

### Comparison
- `(== a b)` - Equality check (loose)
- `(!= a b)` - Inequality check
- `(< n1 n2)` - Less than
- `(> n1 n2)` - Greater than
- `(<= n1 n2)` - Less than or equal
- `(>= n1 n2)` - Greater than or equal

### Boolean Logic
- `(and v1 v2 ...)` - Logical AND (returns first falsy or last value)
- `(or v1 v2 ...)` - Logical OR (returns first truthy or last value)
- `(not v)` - Logical NOT

### Basic I/O
- `(print v1 v2 ...)` - Print without newline
- `(say v1 v2 ...)` - Print with newline

---

## Math Namespace

### Basic Operations
- `(math/mod n1 n2)` - Modulo operation
  ```lisp
  (math/mod 10 3)  ; Returns 1
  ```

- `(math/abs n)` - Absolute value
  ```lisp
  (math/abs -5)  ; Returns 5
  ```

- `(math/sign n)` - Sign of number (-1, 0, or 1)
  ```lisp
  (math/sign -5)  ; Returns -1
  ```

- `(math/min n1 n2 ...)` - Minimum value
  ```lisp
  (math/min 3 1 4 1 5)  ; Returns 1
  ```

- `(math/max n1 n2 ...)` - Maximum value
  ```lisp
  (math/max 3 1 4 1 5)  ; Returns 5
  ```

### Rounding
- `(math/floor n)` - Round down to integer
- `(math/ceil n)` - Round up to integer
- `(math/round n)` - Round to nearest integer
- `(math/trunc n)` - Remove decimal part

### Powers and Logarithms
- `(math/pow base exp)` - Exponentiation
  ```lisp
  (math/pow 2 8)  ; Returns 256
  ```

- `(math/sqrt n)` - Square root
  ```lisp
  (math/sqrt 16)  ; Returns 4
  ```

- `(math/exp n)` - e^n
- `(math/log n)` - Natural logarithm
- `(math/log10 n)` - Base-10 logarithm

### Trigonometry
- `(math/sin n)` - Sine (radians)
- `(math/cos n)` - Cosine (radians)
- `(math/tan n)` - Tangent (radians)
- `(math/asin n)` - Arcsine
- `(math/acos n)` - Arccosine
- `(math/atan n)` - Arctangent
- `(math/atan2 y x)` - Two-argument arctangent

### Constants and Random
- `(math/pi)` - Returns π (3.14159...)
- `(math/e)` - Returns e (2.71828...)
- `(math/random)` - Random number [0, 1)
  ```lisp
  (* (math/random) 100)  ; Random 0-100
  ```

---

## String Namespace

### Case Conversion
- `(string/upper str)` - Convert to uppercase
  ```lisp
  (string/upper "hello")  ; Returns "HELLO"
  ```

- `(string/lower str)` - Convert to lowercase
  ```lisp
  (string/lower "HELLO")  ; Returns "hello"
  ```

### Search Operations
- `(string/index-of str search [start])` - Find first occurrence
  ```lisp
  (string/index-of "hello world" "o")  ; Returns 4
  ```

- `(string/last-index-of str search [start])` - Find last occurrence
- `(string/includes? str search)` - Check if contains substring
- `(string/starts-with? str prefix)` - Check prefix
- `(string/ends-with? str suffix)` - Check suffix

### Transformation
- `(string/trim str)` - Remove whitespace from both ends
- `(string/trim-start str)` - Remove leading whitespace
- `(string/trim-end str)` - Remove trailing whitespace
- `(string/repeat str count)` - Repeat string
  ```lisp
  (string/repeat "!" 3)  ; Returns "!!!"
  ```

- `(string/pad-start str len pad)` - Pad string start
- `(string/pad-end str len pad)` - Pad string end
- `(string/replace str search replace)` - Replace first occurrence
- `(string/replace-all str search replace)` - Replace all occurrences

### Split and Join
- `(string/split str separator)` - Split into list
  ```lisp
  (string/split "a,b,c" ",")  ; Returns ("a" "b" "c")
  ```

- `(string/join list separator)` - Join list into string
  ```lisp
  (string/join (list "a" "b") "-")  ; Returns "a-b"
  ```

### Access
- `(string/length str)` - String length
- `(string/slice str start [end])` - Extract substring
- `(string/substring str start [end])` - Extract substring
- `(string/char-at str index)` - Character at index
- `(string/char-code str index)` - Character code at index
- `(string/from-char-code code1 code2 ...)` - Create string from codes
- `(string/concat str1 str2 ...)` - Concatenate strings

---

## List Namespace

### Creation and Access
- `(list/create v1 v2 ...)` - Create list (alias: `list`)
  ```lisp
  (list/create 1 2 3)  ; Returns (1 2 3)
  ```

- `(list/head lst)` - First element (alias: `head`)
- `(list/tail lst)` - All but first (alias: `tail`)
- `(list/cons item lst)` - Prepend item (alias: `cons`)
- `(list/nth lst n)` - Element at index
  ```lisp
  (list/nth (list "a" "b" "c") 1)  ; Returns "b"
  ```

- `(list/length lst)` - List length
- `(list/empty? lst)` - Check if empty (alias: `empty?`)

### Transformation
- `(list/reverse lst)` - Reverse list
  ```lisp
  (list/reverse (list 1 2 3))  ; Returns (3 2 1)
  ```

- `(list/take lst n)` - Take first n elements
- `(list/drop lst n)` - Drop first n elements
- `(list/append lst1 lst2 ...)` - Concatenate lists
- `(list/flatten lst)` - Flatten nested lists
  ```lisp
  (list/flatten (list 1 (list 2 3) 4))  ; Returns (1 2 3 4)
  ```

- `(list/sort lst [fn])` - Sort list (optional comparator)

### Higher-Order Functions

**Note**: These functions accept both builtin functions (like `+`, `*`) and user-defined functions (named or anonymous with `fun`).

- `(list/map fn lst)` - Apply function to each element
  ```lisp
  ; With anonymous function
  (list/map (fun (x) (* x 2)) (list 1 2 3))  ; Returns (2 4 6)

  ; With named function
  (def double (x) (* x 2))
  (list/map double (list 1 2 3))  ; Returns (2 4 6)
  ```

- `(list/filter fn lst)` - Filter elements by predicate
  ```lisp
  ; With anonymous function
  (list/filter (fun (x) (> x 2)) (list 1 2 3 4))  ; Returns (3 4)

  ; With named function
  (def gt2 (x) (> x 2))
  (list/filter gt2 (list 1 2 3 4))  ; Returns (3 4)
  ```

- `(list/reduce fn init lst)` - Reduce list to single value
  ```lisp
  ; With builtin function
  (list/reduce + 0 (list 1 2 3 4))  ; Returns 10

  ; With user-defined function
  (def sum (acc x) (+ acc x))
  (list/reduce sum 0 (list 1 2 3 4))  ; Returns 10
  ```

### Search
- `(list/includes? lst item)` - Check if contains item
  ```lisp
  (list/includes? (list 1 2 3) 2)  ; Returns true
  ```

---

## Map Namespace

### Creation
- `(map/create)` - Create empty map
  ```lisp
  (def m (map/create))
  ```

- `(map/from-list entries)` - Create from key-value pairs
  ```lisp
  (map/from-list (list (list "a" 1) (list "b" 2)))
  ```

- `(map/merge map1 map2)` - Merge two maps

### Access
- `(map/get map key)` - Get value by key
- `(map/has? map key)` - Check if key exists
- `(map/keys map)` - Get all keys as list
- `(map/values map)` - Get all values as list
- `(map/entries map)` - Get key-value pairs
- `(map/size map)` - Number of entries

### Mutation
- `(map/set! map key value)` - Set key-value pair
  ```lisp
  (map/set! m "name" "Alice")
  ```

- `(map/delete! map key)` - Remove key
- `(map/clear! map)` - Remove all entries

---

## Type Namespace

- `(type/of value)` - Get type as string
  ```lisp
  (type/of 42)         ; Returns "NUMBER"
  (type/of "hello")    ; Returns "STRING"
  (type/of (list 1))   ; Returns "LIST"
  (type/of +)          ; Returns "FUNCTION"
  ```

- `(type/is? value type-string)` - Check if value is of type
  ```lisp
  (type/is? 42 "NUMBER")     ; Returns true
  (type/is? "hi" "STRING")   ; Returns true
  (type/is? 42 "STRING")     ; Returns false
  ```

- `(type/assert value type-string)` - Assert type or throw error
  ```lisp
  (type/assert x "NUMBER")  ; Returns x if NUMBER, else throws
  ```

Type strings: `"NUMBER"`, `"STRING"`, `"BOOLEAN"`, `"LIST"`, `"FUNCTION"`, `"MAP"`, `"NIL"`, `"ERROR"`, `"OBJECT"`

---

## JSON Namespace

- `(json/parse string)` - Parse JSON string
  ```lisp
  (json/parse "{\"x\": 10, \"y\": 20}")
  ```

- `(json/stringify object [pretty?])` - Convert to JSON
  ```lisp
  (json/stringify data)        ; Compact
  (json/stringify data true)   ; Pretty-printed
  ```

---

## Log Namespace

### Logging Functions
- `(log/info msg ...)` - Info level log
- `(log/debug msg ...)` - Debug level log
- `(log/warn msg ...)` - Warning level log (alias: `warn`)
- `(log/error msg ...)` - Error level log

### Control
- `(log/enable)` - Enable all logging
- `(log/disable)` - Disable all logging

All log functions respect the global enable/disable state.

---

## Timer Namespace

- `(timer/timeout fn ms)` - Set timeout, returns ID
  ```lisp
  (timer/timeout (fun () (say "Done!")) 1000)
  ```

- `(timer/interval fn ms)` - Set interval, returns ID
  ```lisp
  (timer/interval (fun () (say "Tick")) 1000)
  ```

- `(timer/clear id)` - Clear timeout or interval
  ```lisp
  (def id (timer/timeout ... 5000))
  (timer/clear id)  ; Cancel it
  ```

- `(timer/sleep ms)` - Async sleep (returns promise)
  ```lisp
  (timer/sleep 1000)  ; Sleep 1 second
  ```

---

## Network Namespace

- `(net/fetch url [options])` - HTTP request (async)
  ```lisp
  (def resp (net/fetch "https://api.example.com/data"))
  (resp.status)     ; HTTP status code
  (resp.text)       ; Get text (async)
  (resp.json)       ; Parse JSON (async)
  ```

- `(net/url-encode str)` - URL encode string
  ```lisp
  (net/url-encode "hello world")  ; Returns "hello%20world"
  ```

- `(net/url-decode str)` - URL decode string
  ```lisp
  (net/url-decode "hello%20world")  ; Returns "hello world"
  ```

---

## Process Namespace

- `(process/spawn code-or-fn [args...])` - Spawn new process
  ```lisp
  ; Spawn with code string
  (process/spawn "(say \"Worker running\")")

  ; Spawn with function
  (def worker (fun () (recv)))
  (process/spawn worker)
  ```

- `(process/send pid data)` - Send message to process
  ```lisp
  (process/send 1 "Hello")
  ```

- `(process/recv [timeout])` - Receive message
  ```lisp
  (process/recv)       ; Block until message
  (process/recv 1000)  ; Timeout after 1 second
  ; Returns [from-pid data] or null on timeout
  ```

- `(process/self)` - Get current process ID
- `(process/alive? pid)` - Check if process is alive
- `(process/kill pid)` - Terminate process
- `(process/list)` - List all process IDs

### Backward Compatibility
These functions have aliases without the `process/` prefix:
`spawn`, `send`, `recv`, `self`, `is-alive?`, `kill`, `processes`

---

## File System Namespace (Node.js)

### Read and Write
- `(fs/read filepath)` - Read file as string
  ```lisp
  (fs/read "config.json")
  ```

- `(fs/write! filepath content)` - Write string to file
  ```lisp
  (fs/write! "output.txt" "Hello World")
  ```

- `(fs/append! filepath content)` - Append to file

### File Management
- `(fs/exists? filepath)` - Check if file exists
- `(fs/delete! filepath)` - Delete file
- `(fs/copy! source dest)` - Copy file
- `(fs/move! source dest)` - Move/rename file

### Directories
- `(fs/mkdir! path [recursive?])` - Create directory
  ```lisp
  (fs/mkdir! "path/to/dir" true)  ; Create recursively
  ```

- `(fs/readdir path)` - List directory contents
  ```lisp
  (fs/readdir ".")  ; List current directory
  ```

### File Information
- `(fs/stat filepath)` - Get file statistics
  ```lisp
  (def info (fs/stat "file.txt"))
  ; Returns map with: size, isFile, isDirectory, mtime, ctime
  ```

- `(fs/resolve path [base])` - Resolve to absolute path

### Special
- `(include filepath)` - Load and execute Slight file
  ```lisp
  (include "lib/utils.sl")
  ```

### Backward Compatibility
Some functions have aliases: `read-file`, `write-file!`, `file-exists?`

---

## System Namespace (Node.js)

### Environment
- `(sys/env name)` - Get environment variable
  ```lisp
  (sys/env "HOME")
  ```

- `(sys/args)` - Get command-line arguments
  ```lisp
  (sys/args)  ; Returns list of arguments
  ```

### Process Control
- `(sys/exit [code])` - Exit process
  ```lisp
  (sys/exit 0)  ; Success
  (sys/exit 1)  ; Error
  ```

### Working Directory
- `(sys/cwd)` - Get current working directory
- `(sys/chdir! path)` - Change working directory
  ```lisp
  (sys/chdir! "/tmp")
  ```

### System Information
- `(sys/platform)` - Get platform (darwin, linux, win32, etc.)
- `(sys/arch)` - Get CPU architecture (x64, arm64, etc.)

### Backward Compatibility
`get-env` is an alias for `sys/env`

---

## Notes

1. **Cross-Platform**: Functions in `math/`, `string/`, `list/`, `map/`, `type/`, `json/`, `log/`, `timer/`, `net/`, and `process/` namespaces work in both Node.js and browser environments.

2. **Node.js Only**: Functions in `fs/` and `sys/` namespaces require Node.js.

3. **Async Functions**: Some functions are asynchronous and return promises:
   - `list/map`, `list/filter`, `list/reduce`
   - `timer/sleep`
   - `net/fetch`
   - `process/spawn`, `process/recv`
   - `include`

4. **Mutation**: Functions ending in `!` mutate their arguments:
   - `map/set!`, `map/delete!`, `map/clear!`
   - `fs/write!`, `fs/append!`, `fs/delete!`, `fs/mkdir!`, `fs/copy!`, `fs/move!`
   - `sys/chdir!`
   - `set!` (special form, not a builtin)

5. **Type Safety**: Use `type/` functions for runtime type checking:
   ```lisp
   (def safe-divide (fun (a b)
     (begin
       (type/assert a "NUMBER")
       (type/assert b "NUMBER")
       (if (== b 0)
         (throw "Division by zero")
         (/ a b)))))
   ```

6. **Higher-Order Functions**: `list/map`, `list/filter`, and `list/reduce` work seamlessly with:
   - Builtin functions (e.g., `+`, `-`, `*`, `/`)
   - User-defined named functions (e.g., `(def double (x) (* x 2))`)
   - Anonymous functions with `fun` (e.g., `(fun (x) (* x 2))`)
   - Closures that capture their lexical environment