# Changelog

All notable changes to Slight will be documented in this file.

## [Unreleased] - 2025-10-16

### Added

#### Core Language Features

- **Let Bindings** - Lexically-scoped local bindings with sequential evaluation
  - Syntax: `(let ((var1 val1) (var2 val2) ...) body)`
  - Variables are evaluated sequentially, allowing later bindings to reference earlier ones
  - Proper lexical scoping with shadowing support

- **Anonymous Functions** - First-class functions with the `fun` keyword
  - Syntax: `(fun (params...) body)`
  - Can be immediately invoked: `((fun (x) (* x 2)) 5)`
  - Full support as function arguments and return values

- **Lexical Closures** - Complete closure implementation with environment capture
  - Functions capture their lexical environment at definition time
  - Closures maintain access to captured variables
  - Support for higher-order functions and currying
  - Y combinator and other advanced functional patterns work correctly

- **Macro System** - Compile-time metaprogramming with hygenic macro expansion
  - Syntax: `(defmacro name (params...) body)`
  - Macros receive unevaluated AST as arguments
  - Macro bodies are evaluated to produce new code
  - Full support for code generation and syntax transformations
  - Separate MacroExpander pipeline stage ensures clean expansion

#### Built-in Functions

- **Map Operations**
  - `make-map` - Create a new Map object
  - `map-get` - Get value by key
  - `map-set!` - Set key-value pair (mutates)
  - `map-has?` - Check if key exists
  - `map-delete!` - Remove key (mutates)
  - `map-keys` - Get all keys as list
  - `map-values` - Get all values as list
  - `map-size` - Get number of entries

- **File Operations**
  - `read-file` - Read file contents as string
  - `write-file!` - Write string to file
  - `file-exists?` - Check if file exists
  - `delete-file!` - Delete a file
  - `resolve-path` - Resolve relative paths
  - `include` - Load and execute a Slight file

- **JSON Operations**
  - `json-parse` - Parse JSON string to Slight data
  - `json-stringify` - Convert Slight data to JSON string

- **System Operations**
  - `get-env` - Get environment variable
  - `exit` - Exit program with code

#### CLI Features

- **Command-line Interface** (`bin/slight.ts`)
  - Interactive REPL mode (default)
  - File execution: `slight program.sl`
  - Expression evaluation: `slight -e "(+ 1 2)"`
  - Include paths: `slight -i lib/ program.sl`
  - Help: `slight --help`

- **Include Path Resolution**
  - `-i/--include-path` option for specifying directories
  - Searches paths in order: current file directory, include paths, absolute/cwd
  - Circular dependency detection
  - Clear error messages with searched paths

#### Architecture Improvements

- **Object-Oriented AST** - Refactored to OO design where each node evaluates itself
  - New AST node classes: `LetNode`, `FunNode`, `DefNode`, `CondNode`, etc.
  - Each node has its own `evaluate()` method
  - Cleaner separation of concerns
  - Easier to extend with new node types

- **Simplified Pipeline** - Clean separation of concerns with specialized stages
  - Tokenizer → Parser → MacroExpander → Interpreter → Output
  - MacroExpander stage handles compile-time code transformations
  - More straightforward execution model
  - Better error propagation

### Development Process

- **Test-Driven Development** - Established TDD as the standard development methodology
  - Write tests before implementation
  - Comprehensive test coverage for all features
  - Tests serve as documentation and specification

### Testing

- Added comprehensive test suites:
  - `110-Let.test.ts` - Let binding tests
  - `120-Include.test.ts` - File inclusion tests
  - `130-Closures.test.ts` - Closure behavior tests
  - `140-AnonymousFunctions.test.ts` - Anonymous function tests
  - `150-ComprehensiveClosure.test.ts` - Advanced closure patterns
  - `160-Macros.test.ts` - Macro expansion and transformation tests

- Test fixtures organized in `tests/fixtures/` directory

### Examples

- Created example programs demonstrating features:
  - `examples/anonymous-functions.sl` - Anonymous function usage
  - `examples/advanced-closures.sl` - Complex closure patterns
  - Various test fixtures showing include functionality

### Documentation

- Updated README with new features and examples
- Created DEVELOPMENT.md with TDD guidelines and patterns
- Added comprehensive inline documentation

## Technical Details

### Breaking Changes

- Functions defined with `def` in global scope now return `true` instead of the function object
- Use `fun` for creating anonymous functions that can be used as values

### Implementation Notes

- Closures capture their environment by value (immutable)
- Let bindings create new lexical scopes
- Maps are the only mutable data structure (via `map-set!` and `map-delete!`)
- File operations are synchronous for simplicity
- Include uses the same parser/interpreter pipeline

### Known Limitations

- No mutable variables (except Maps)
- No module/namespace system (convention-based with symbol prefixes)
- Mutual recursion requires careful function ordering
- No tail call optimization
- Macros do not support variable-argument syntax (use lists explicitly)

## Migration Guide

If upgrading from a previous version:

1. Replace inline function definitions used as values with `fun`:
   ```lisp
   ; Old (would not work as expected)
   (def mapper (make-mapper (def f (x) (* x 2))))

   ; New
   (def mapper (make-mapper (fun (x) (* x 2))))
   ```

2. Use `let` for local bindings instead of nested `def`:
   ```lisp
   ; Old
   (def compute (x)
     (def temp (* x 2))
     (+ temp 1))

   ; New
   (def compute (x)
     (let ((temp (* x 2)))
       (+ temp 1)))
   ```

## Future Considerations

- Tail call optimization for better recursion performance
- Mutable variables with `set!`
- Module system with proper namespaces
- Quasiquote and unquote for easier macro writing
- Gensym for hygenic macros
- Async/await support for async operations
- Better error messages with line/column information