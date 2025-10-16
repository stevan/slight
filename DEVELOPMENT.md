# Development Guidelines

## Test-Driven Development (TDD) Approach

This project follows a strict Test-Driven Development methodology. As established during development:

> "Let's follow this pattern with all the tests (make a note for yourself about this), whenever we discuss a feature we write unit tests first before we implement things. Also for verifying features as well."

### TDD Workflow

1. **Write Tests First**: Before implementing any new feature, write comprehensive tests that define the expected behavior
2. **Run Tests**: Verify that tests fail (Red phase)
3. **Implement Feature**: Write the minimal code needed to make tests pass (Green phase)
4. **Refactor**: Clean up the implementation while keeping tests green (Refactor phase)
5. **Verify**: Run all tests to ensure no regressions

### Example: Adding the `fun` Keyword

Here's how we added anonymous functions to Slight:

```typescript
// 1. First, write the test (tests/140-AnonymousFunctions.test.ts)
test('fun creates anonymous function', async () => {
    const code = `
        (def add (fun (x y) (+ x y)))
        (add 3 4)
    `;
    const results = await runSlight(code);
    const finalResult = results.filter(r => r.value !== null && r.value !== true).pop();
    assert.strictEqual(finalResult.value, 7);
});

// 2. Then implement the feature (src/Slight/AST.ts)
export class FunNode extends ASTNode {
    async evaluate(interpreter: any, params: Map<string, any>): Promise<any> {
        // Implementation here...
    }
}
```

## Project Structure

```
slight/
├── src/
│   ├── Slight/
│   │   ├── AST.ts                # AST node definitions
│   │   ├── Parser.ts             # Token to AST parsing
│   │   ├── Tokenizer.ts          # String to token conversion
│   │   ├── CoreInterpreter.ts    # Base interpreter with common functionality
│   │   ├── Interpreter.ts        # Node.js interpreter (extends Core)
│   │   ├── BrowserInterpreter.ts # Browser interpreter (extends Core)
│   │   ├── MacroExpander.ts      # Parameterized macro expansion
│   │   ├── ProcessRuntime.ts     # Process/actor system
│   │   ├── REPL.ts               # Interactive REPL
│   │   └── Types.ts              # Type definitions
│   ├── Slight.ts                 # Node.js entry point
│   └── browser.ts                # Browser entry point
├── tests/
│   ├── fixtures/                 # Test fixture files
│   ├── 100-Pipeline.test.ts      # Core pipeline tests
│   ├── 110-Let.test.ts           # Let binding tests
│   ├── 120-Include.test.ts       # File inclusion tests
│   ├── 130-Closures.test.ts      # Closure tests
│   └── 140-AnonymousFunctions.test.ts # Anonymous function tests
├── examples/                     # Example Slight programs
├── bin/
│   └── slight.ts                 # CLI entry point
├── index.html                    # Browser interface
└── js/                           # Compiled JavaScript (gitignored)
```

## Testing Guidelines

### Test Organization

- Group related tests in descriptive test files
- Use clear, descriptive test names that explain the behavior being tested
- Include both positive and negative test cases
- Test edge cases and error conditions

### Test Helpers

```typescript
// Standard helper for running Slight code in tests
async function runSlight(code: string): Promise<any[]> {
    async function* mockAsyncGen(items: string[]) {
        for (const i of items) yield i;
    }

    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(mockAsyncGen([code]));
    const asts = parser.run(tokens);
    const results: any[] = [];
    for await (const result of interpreter.run(asts)) {
        results.push(result);
    }
    return results;
}
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "Closures"

# Run tests matching a pattern
npm test -- --grep "anonymous"
```

## Browser Development

### Building for Browser

```bash
# Compile TypeScript to JavaScript
npm run build
# or
tsc

# Open in browser
open index.html
```

### Browser-Specific Components

The browser implementation uses inheritance to share code:

```typescript
// CoreInterpreter has all platform-agnostic functionality
export class CoreInterpreter {
    protected initBuiltins(): void {
        // Core builtins (arithmetic, lists, etc.)
    }
    protected addMapBuiltins(): void { /* ... */ }
    protected addJSONBuiltins(): void { /* ... */ }
    protected addProcessBuiltins(): void { /* ... */ }
}

// BrowserInterpreter adds only browser-safe builtins
export class BrowserInterpreter extends CoreInterpreter {
    protected override initBuiltins(): void {
        super.initBuiltins();
        this.addMapBuiltins();
        this.addJSONBuiltins();
        this.addProcessBuiltins();
        // No file or system operations
    }
}

// Node.js Interpreter adds file and system operations
export class Interpreter extends CoreInterpreter {
    protected override initBuiltins(): void {
        super.initBuiltins();
        this.addMapBuiltins();
        this.addJSONBuiltins();
        this.addProcessBuiltins();
        this.addFileBuiltins();    // Node.js only
        this.addSystemBuiltins();  // Node.js only
    }
}
```

### Testing Browser Code

1. **Manual Testing**: Open `index.html` and use the interactive editor
2. **Console Testing**: Use browser DevTools console
   ```javascript
   import { evaluate } from './js/src/browser.js';
   const { results, errors } = await evaluate('(+ 1 2)');
   ```
3. **Visual Testing**: The HTML interface includes example programs

### Browser Compatibility Notes

- Requires ES2020+ support (async/await, generators)
- ES Modules must be supported
- Tested on Chrome 90+, Firefox 88+, Safari 14+
- Processes use Promise-based scheduling (concurrent but not parallel)

## Adding New Features

### Checklist for New Features

1. **Discuss the feature** - Understand requirements and edge cases
2. **Write comprehensive tests** - Cover all use cases before implementation
3. **Update AST if needed** - Add new node types to AST.ts
4. **Update Parser** - Add parsing logic for new syntax
5. **Update Interpreter** - Add evaluation logic
6. **Run all tests** - Ensure no regressions
7. **Update documentation** - Add examples and update README
8. **Create examples** - Add example files demonstrating the feature

### Example Feature Addition Flow

When adding `let` bindings:

1. **Wrote tests first** (`tests/110-Let.test.ts`)
2. **Created LetNode AST class** (`src/Slight/AST.ts`)
3. **Added parser support** (`src/Slight/Parser.ts`)
4. **Implemented evaluation** (in LetNode.evaluate)
5. **Verified all tests pass**
6. **Added examples** (`examples/let-bindings.sl`)

## Code Style Guidelines

### TypeScript Conventions

- Use explicit types for function parameters and return values
- Prefer `const` over `let` when possible
- Use async/await over callbacks
- Use meaningful variable names

### AST Node Pattern

Every AST node follows this pattern:

```typescript
export class NodeName extends ASTNode {
    type = 'NODE_TYPE';

    constructor(/* parameters */) {
        super();
    }

    async evaluate(
        interpreter: any,
        params: Map<string, any>
    ): Promise<any> {
        // Evaluation logic
    }
}
```

## Debugging Tips

### REPL Testing

Use the REPL for quick testing:

```bash
node js/bin/slight.js
> (fun (x) (* x 2))
> ((fun (x) (* x 2)) 5)
```

### File Execution

Test with files:

```bash
node js/bin/slight.js examples/closures.sl
```

### Expression Evaluation

Quick one-liner tests:

```bash
node js/bin/slight.js -e "(+ 1 2)"
```

## Common Patterns

### Closure Pattern

Closures capture their lexical environment:

```lisp
(def make-counter (init)
  (fun ()
    (let ((current init))
      current)))
```

### Higher-Order Functions

Functions that operate on other functions:

```lisp
(def map (f lst)
  (cond
    ((empty? lst) (list))
    (else (cons (f (head lst))
                (map f (tail lst))))))
```

### Recursive Patterns

Use `cond` for base and recursive cases:

```lisp
(def factorial (n)
  (cond
    ((== n 0) 1)
    (else (* n (factorial (- n 1))))))
```

## Contributing

1. Follow the TDD approach strictly
2. Ensure all tests pass before submitting
3. Add tests for any new functionality
4. Update documentation for API changes
5. Keep commits focused and descriptive

## Performance Considerations

- The interpreter uses async generators for streaming evaluation
- Each stage of the pipeline processes data incrementally
- Closures capture environments by value (immutable)
- Maps are mutable for efficiency (map-set! modifies in place)