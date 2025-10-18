
```
   _____ ___       __    __
  / ___// (_)___ _/ /_  / /_
  \__ \/ / / __ `/ __ \/ __/
 ___/ / / / /_/ / / / / /_
/____/_/_/\__, /_/ /_/\__/
         /____/
```

Slight is a mini-LISP like interpreter written in TypeScript. The interpreter features a REPL, tokenizer, parser, compiler, interpreter, and output, each as a composable async generator.

## Examples

### Core Language Features

```lisp
; Function definition
(def factorial (n)
  (cond
    ((== n 0) 1)
    (else (* n (factorial (- n 1))))))

; Anonymous functions and closures
(def make-adder (x)
  (fun (y) (+ x y)))

(def add5 (make-adder 5))
(add5 10)  ; Returns 15

; Let bindings with lexical scope
(let ((x 10)
      (y 20))
  (+ x y))  ; Returns 30

; Quote syntax for preventing evaluation
'(+ 1 2)          ; Returns the list (+ 1 2) instead of 3
(quote (+ 1 2))   ; Equivalent to '(+ 1 2)

; Macros for metaprogramming
(defmacro when (test body)
  (list 'cond (list test body)))  ; Using quote syntax

(when (> x 10) (say "big"))  ; Expands to: (cond ((> x 10) (say "big")))
```

### Using Namespaced Functions

```lisp
; Math operations
(math/sqrt 16)                    ; Returns 4
(math/pow 2 8)                    ; Returns 256
(math/round 3.7)                  ; Returns 4
(math/sin (/ (math/pi) 2))        ; Returns 1

; String manipulation
(string/upper "hello world")       ; Returns "HELLO WORLD"
(string/split "one,two,three" ",") ; Returns ("one" "two" "three")
(string/join (list "a" "b") "-")   ; Returns "a-b"
(string/starts-with? "hello" "he") ; Returns true
(string/repeat "!" 3)              ; Returns "!!!"

; Advanced list operations
(list/map (fun (x) (* x x)) (list 1 2 3))     ; Returns (1 4 9)
(list/filter (fun (x) (> x 2)) (list 1 2 3 4)) ; Returns (3 4)
(list/reduce + 0 (list 1 2 3 4))              ; Returns 10
(list/take (list 1 2 3 4 5) 3)                ; Returns (1 2 3)
(list/flatten (list 1 (list 2 3) 4))          ; Returns (1 2 3 4)

; Map/dictionary operations
(def person (map/create))
(map/set! person "name" "Alice")
(map/set! person "age" 30)
(map/get person "name")           ; Returns "Alice"
(map/keys person)                 ; Returns ("name" "age")

; Type inspection
(type/of 42)                      ; Returns "NUMBER"
(type/is? "hello" "STRING")       ; Returns true
(type/assert x "NUMBER")          ; Throws error if x is not a number

; JSON handling with pretty-print
(def data (json/parse "{\"x\": 10}"))
(json/stringify data true)        ; Pretty-printed JSON

; Async timers (cross-platform)
(timer/sleep 1000)                ; Sleep for 1 second
(def id (timer/timeout (fun () (say "Done!")) 1000))
(timer/clear id)                  ; Cancel the timer

; Network requests (Node.js 18+ and browser)
(def resp (net/fetch "https://api.example.com/data"))
(resp.json)                       ; Parse JSON response
```

### Concurrent Processes

```lisp
; Spawn a process with a function
(def worker (fun ()
  (begin
    (say "Worker started")
    (def msg (recv))
    (send (head msg) (* (head (tail msg)) 2)))))

(def pid (process/spawn worker))
(process/send pid 21)
(def result (process/recv 1000))  ; Returns [pid 42]
(process/kill pid)
(process/list)                    ; List all processes
```

---

## Features

### Core Language
- **Lisp-like syntax**: S-expressions with full support for nested structures
- **Functions**: Named functions with `def` and anonymous functions with `fun`
- **Lexical closures**: Full closure support with environment capture
- **Let bindings**: Lexically-scoped local bindings with sequential evaluation
- **Conditionals**: `cond` expressions with multiple clauses and `else`
- **Recursion**: Full support for recursive and mutually recursive functions
- **Quoting**: Quote expressions to treat them as data
- **Macros**: Compile-time metaprogramming with `defmacro` for syntax transformations
- **Processes**: Erlang-style actor model for concurrent programming with message passing

### Built-in Operations

Slight features a comprehensive standard library organized into logical namespaces:

#### Core Operations (No Namespace)
- **Arithmetic**: `+`, `-`, `*`, `/`
- **Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logic**: `and`, `or`, `not`
- **Basic I/O**: `print` (no newline), `say` (with newline)

#### Namespaced Functions

**`math/`** - Mathematical operations (22 functions)
- **Basic**: `math/mod`, `math/abs`, `math/sign`, `math/min`, `math/max`
- **Rounding**: `math/floor`, `math/ceil`, `math/round`, `math/trunc`
- **Powers**: `math/pow`, `math/sqrt`, `math/exp`, `math/log`, `math/log10`
- **Trigonometry**: `math/sin`, `math/cos`, `math/tan`, `math/asin`, `math/acos`, `math/atan`, `math/atan2`
- **Constants**: `math/pi`, `math/e`
- **Random**: `math/random`

**`string/`** - String manipulation (20 functions)
- **Case**: `string/upper`, `string/lower`
- **Search**: `string/index-of`, `string/last-index-of`, `string/includes?`, `string/starts-with?`, `string/ends-with?`
- **Transform**: `string/trim`, `string/trim-start`, `string/trim-end`, `string/repeat`, `string/pad-start`, `string/pad-end`
- **Split/Join**: `string/split`, `string/join`, `string/replace`, `string/replace-all`
- **Access**: `string/length`, `string/slice`, `string/substring`, `string/char-at`, `string/char-code`, `string/from-char-code`, `string/concat`

**`list/`** - List operations (15+ functions)
- **Creation**: `list/create`, `list/cons`, `list/append`, `list/flatten`
- **Access**: `list/head`, `list/tail`, `list/nth`, `list/length`, `list/empty?`
- **Transform**: `list/reverse`, `list/take`, `list/drop`, `list/sort`
- **Higher-order**: `list/map`, `list/filter`, `list/reduce` (work with builtin and user-defined functions)
- **Search**: `list/includes?`

**`map/`** - Map/dictionary operations (11 functions)
- **Creation**: `map/create`, `map/from-list`, `map/merge`
- **Access**: `map/get`, `map/has?`, `map/keys`, `map/values`, `map/entries`, `map/size`
- **Mutation**: `map/set!`, `map/delete!`, `map/clear!`

**`type/`** - Type inspection
- `type/of` - Get type as string (NUMBER, STRING, BOOLEAN, LIST, MAP, FUNCTION, etc.)
- `type/is?` - Check if value is of given type
- `type/assert` - Assert type or throw error

**`json/`** - JSON operations
- `json/parse` - Parse JSON string to object
- `json/stringify` - Convert object to JSON (optional pretty-print)

**`log/`** - Structured logging
- **Levels**: `log/info`, `log/debug`, `log/warn`, `log/error`
- **Control**: `log/enable`, `log/disable`

**`timer/`** - Timer operations (Cross-platform)
- `timer/timeout` - Set timeout (returns ID)
- `timer/interval` - Set interval (returns ID)
- `timer/clear` - Clear timeout/interval
- `timer/sleep` - Async sleep

**`net/`** - Network operations (Cross-platform, Node.js 18+)
- `net/fetch` - HTTP requests (async)
- `net/url-encode`, `net/url-decode` - URL encoding

**`process/`** - Concurrent processes
- `process/spawn`, `process/send`, `process/recv`, `process/self`
- `process/alive?`, `process/kill`, `process/list`

#### Platform-Specific

**`fs/`** - File system (Node.js only)
- **Read/Write**: `fs/read`, `fs/write!`, `fs/append!`
- **Management**: `fs/exists?`, `fs/delete!`, `fs/mkdir!`, `fs/copy!`, `fs/move!`
- **Info**: `fs/stat`, `fs/readdir`, `fs/resolve`
- **Special**: `include` (load and execute files)

**`sys/`** - System operations (Node.js only)
- **Environment**: `sys/env`, `sys/args`
- **Process**: `sys/exit`, `sys/cwd`, `sys/chdir!`
- **Info**: `sys/platform`, `sys/arch`

#### Backward Compatibility
Important functions retain their original names as aliases:
- List operations: `list`, `head`, `tail`, `cons`, `empty?`
- Math: `mod`
- File operations: `read-file`, `write-file!`, `file-exists?`
- System: `get-env`
- Processes: `spawn`, `send`, `recv`, `self`, `kill`, `processes`

### Architecture
- **Pipeline architecture**: Each stage (Tokenizer, Parser, MacroExpander, Interpreter, Output) is an independent async generator
- **Macro expansion stage**: Separate pipeline stage for compile-time code transformations
- **Object-oriented AST**: Each AST node knows how to evaluate itself
- **REPL**: Interactive, multi-line, paren-balanced input
- **CLI**: Command-line interface with file execution, expression evaluation, and include paths
- **File inclusion**: Load and execute code from files with circular dependency detection
- **Test suite**: Comprehensive coverage with 88 tests across all standard library namespaces

---

## Pipeline Architecture

```
Input → Tokenizer → Parser → MacroExpander → Interpreter → Output
```
- **Tokenizer**: Converts input strings to tokens.
- **Parser**: Converts tokens to AST nodes, including special forms like `def`, `defmacro`, `let`, `fun`, etc.
- **MacroExpander**: Expands macro calls at compile-time by evaluating macro bodies and transforming AST.
- **Interpreter**: Evaluates AST nodes and user-defined functions.
- **Output**: Pretty-prints results or errors.

Each stage is an async generator, making the pipeline composable and testable.

---

## CLI Usage

```bash
# Start interactive REPL
slight

# Start REPL with debugging features
slight --debug

# Execute a file
slight program.sl

# Evaluate an expression
slight -e "(+ 1 2)"

# Include directories for file loading
slight -i lib/ -i vendor/ program.sl

# Show help
slight --help
```

### Debug Mode

When running with `--debug`, the REPL provides additional debugging commands:

- `:ast <expr>` - Show the Abstract Syntax Tree for an expression
- `:tokens <expr>` - Show the token stream for an expression
- `:expand <expr>` - Show the macro-expanded form of an expression
- `:bindings` - Show current bindings in the environment
- `:q` - Quit the REPL

Enhanced error messages now include line and column information:
```
💔 Error at line 4, column 6:
  Undefined symbol: z
```

---

## Browser Support

Slight runs in modern web browsers with a **visual terminal UI** that displays multiple process windows! The browser implementation includes all core features including the **full process/actor system with visual windows**.

### Quick Start

```bash
# Build the TypeScript code
npm run build

# Serve with a local HTTP server
npx http-server -p 8080

# Open http://localhost:8080 in your browser
```

### Interactive Terminal UI

The browser interface features a retro-inspired terminal UI:
- **Multiple windows**: Each process gets its own draggable, resizable terminal window
- **Visual process tracking**: Window titles show PID and parent PID (e.g., "PID: 1 (Parent: 0)")
- **Smart positioning**: Spawned windows appear to the right or below parent windows
- **Mailbox indicators**: 📬 icon appears when messages are waiting
- **Process state visualization**: Windows turn red when processes are terminated
- **Command history**: Use ↑/↓ arrows to navigate previous commands
- **Closeable windows**: Terminated windows can be closed with an "✕ Close" button

### Browser-Specific Files
- `src/browser.ts` - Browser entry point with StringSource and ArrayOutput
- `src/Slight/BrowserInterpreter.ts` - Browser-compatible interpreter
- `index.html` - Interactive terminal UI with multi-window process visualization

### What Works in Browser
✅ All core language features (arithmetic, comparisons, boolean operations)
✅ Functions, closures, and lexical scoping
✅ List and Map operations
✅ Macros and metaprogramming
✅ **Process/actor system with message passing and visual windows**
✅ JSON operations
✅ Exception handling (try/catch/throw)

### What Doesn't Work in Browser
❌ File operations (read-file, write-file!, etc.)
❌ System operations (get-env, exit)
❌ Include functionality

### Browser Usage Example

Try this in the browser REPL to see multiple process windows:

```lisp
; Define a worker function
(def worker (fun () (begin (send 0 "Hello from worker!") (recv))))

; Spawn it - a new window appears!
(def pid (spawn worker))

; Receive the message in main window
(recv)

; Send a reply back
(send pid "Hello back!")

; Check all running processes
(processes)
```

For programmatic usage, see [BROWSER_README.md](BROWSER_README.md).

---

## Example: Programmatic Usage

```ts
import { Slight } from './src/Slight.js';
import { REPL, REPLOutput } from './src/Slight/REPL.js';
import { ConsoleOutput } from './src/Slight/Outputs.js';

// Interactive REPL
const slight = new Slight(new REPL(), new REPLOutput());
await slight.run();

// Or execute code directly
import { Tokenizer } from './src/Slight/Tokenizer.js';
import { Parser } from './src/Slight/Parser.js';
import { MacroExpander } from './src/Slight/MacroExpander.js';
import { Interpreter } from './src/Slight/Interpreter.js';

async function* stringSource(code: string) {
  yield code;
}

const tokenizer = new Tokenizer();
const parser = new Parser();
const macroExpander = new MacroExpander();
const interpreter = new Interpreter();

const tokens = tokenizer.run(stringSource("(+ 1 2)"));
const asts = parser.run(tokens);
const expanded = macroExpander.run(asts);
for await (const result of interpreter.run(expanded)) {
  console.log(result);
}
```
