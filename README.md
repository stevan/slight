# ML - Mini-LISP

A modular, pipeline-based Lisp-like interpreter written in TypeScript. The interpreter features a REPL, tokenizer, parser, compiler, interpreter, and output, each as a composable async generator. The codebase is fully tested and supports debugging at any pipeline stage.

---

## Features
- **Lisp-like syntax**: Supports arithmetic, logic, lists, quoting, conditionals, user functions, and recursion.
- **Pipeline architecture**: Each stage (Tokenizer, Parser, Compiler, Interpreter, Output) is an independent async generator.
- **REPL**: Interactive, multi-line, paren-balanced input.
- **Comprehensive tests**: Unit and integration tests for all stages.

---

## Pipeline Architecture

```
Input → Tokenizer → Parser → Compiler → Interpreter → Output
```
- **Tokenizer**: Converts input strings to tokens.
- **Parser**: Converts tokens to AST nodes.
- **Compiler**: Transforms AST nodes, handles special forms.
- **Interpreter**: Evaluates compiled expressions and functions.
- **Output**: Pretty-prints results or errors.

Each stage is an async generator, making the pipeline composable and testable.

---

## Example: Programmatic Usage

```ts
import { REPL } from './src/REPL.js';
import { Tokenizer } from './src/Tokenizer.js';
import { Parser } from './src/Parser.js';
import { Compiler } from './src/Compiler.js';
import { Interpreter } from './src/Interpreter.js';
import { Output } from './src/Output.js';

async function run() {
  const repl = new REPL();
  const tokenizer = new Tokenizer();
  const parser = new Parser();
  const compiler = new Compiler();
  const interpreter = new Interpreter();
  const output = new Output();

  await output.run(
    interpreter.run(
      compiler.run(
        parser.run(
          tokenizer.run(
            repl.run()
          )
        )
      )
    )
  );
}

run();
```
