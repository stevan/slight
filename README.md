
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

(def adder (n m) (+ n m))

(def factorial (n)
  (cond
    ((== n 0) 1)
    (else (* n (factorial (- n 1))))))


(def even? (n) (cond ((== n 0) true ) (else (odd?  (- n 1)))))
(def odd?  (n) (cond ((== n 0) false) (else (even? (- n 1)))))


(def sum-list (lst)
  (cond
    ((empty? lst) 0)
    (else (+ (head lst) (sum-list (tail lst))))))

```

---

## Features
- **Lisp-like syntax**: Supports arithmetic, logic, lists, quoting, conditionals, user functions, and recursion.
- **Pipeline architecture**: Each stage (Tokenizer, Parser, Interpreter, Output) is an independent async generator.
- **REPL**: Interactive, multi-line, paren-balanced input.
- **Comprehensive tests**: Unit and integration tests for all stages.

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

## Example: Programmatic Usage

```ts
import { REPL } from './src/REPL.js';
import { Tokenizer } from './src/Tokenizer.js';
import { Parser } from './src/Parser.js';
import { Interpreter } from './src/Interpreter.js';
import { Output } from './src/Output.js';

async function run() {
  const repl = new REPL();
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const interpreter = new Interpreter();
  const output = new Output();

  await output.run(
    interpreter.run(
      parser.run(
        tokenizer.run(
          repl.run()
        )
      )
    )
  );
}

run();
```
