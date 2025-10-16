
```
   _____ ___       __    __
  / ___// (_)___ _/ /_  / /_
  \__ \/ / / __ `/ __ \/ __/
 ___/ / / / /_/ / / / / /_
/____/_/_/\__, /_/ /_/\__/
         /____/
```

Slight is a mini-LISP like interpreter written in TypeScript. The interpreter features a REPL, tokenizer, parser, compiler, interpreter, and output, each as a composable async generator.

## Example

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

; Higher-order functions
(def map (f lst)
  (cond
    ((empty? lst) (list))
    (else (cons (f (head lst)) (map f (tail lst))))))

(map (fun (x) (* x x)) (list 1 2 3))  ; Returns (1 4 9)
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

### Built-in Operations
- **Arithmetic**: `+`, `-`, `*`, `/`, `mod`
- **Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logic**: `and`, `or`, `not`
- **Lists**: `list`, `head`, `tail`, `cons`, `empty?`
- **Maps**: `make-map`, `map-get`, `map-set!`, `map-has?`, `map-delete!`, `map-keys`, `map-values`
- **Files**: `read-file`, `write-file!`, `file-exists?`, `delete-file!`, `include`
- **JSON**: `json-parse`, `json-stringify`
- **System**: `get-env`, `exit`

### Architecture
- **Pipeline architecture**: Each stage (Tokenizer, Parser, Interpreter, Output) is an independent async generator
- **Object-oriented AST**: Each AST node knows how to evaluate itself
- **REPL**: Interactive, multi-line, paren-balanced input
- **CLI**: Command-line interface with file execution, expression evaluation, and include paths
- **File inclusion**: Load and execute code from files with circular dependency detection

---

## Pipeline Architecture

```
Input → Tokenizer → Parser → Interpreter → Output
```
- **Tokenizer**: Converts input strings to tokens.
- **Parser**: Converts tokens to AST nodes, including a dedicated DEF node for function definitions.
- **Interpreter**: Evaluates AST nodes and user-defined functions.
- **Output**: Pretty-prints results or errors.

Each stage is an async generator, making the pipeline composable and testable.

---

## CLI Usage

```bash
# Start interactive REPL
slight

# Execute a file
slight program.sl

# Evaluate an expression
slight -e "(+ 1 2)"

# Include directories for file loading
slight -i lib/ -i vendor/ program.sl

# Show help
slight --help
```

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
import { Interpreter } from './src/Slight/Interpreter.js';

async function* stringSource(code: string) {
  yield code;
}

const tokenizer = new Tokenizer();
const parser = new Parser();
const interpreter = new Interpreter();

const tokens = tokenizer.run(stringSource("(+ 1 2)"));
const asts = parser.run(tokens);
for await (const result of interpreter.run(asts)) {
  console.log(result);
}
```
