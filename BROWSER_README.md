# Slight LISP - Browser Version

This is Phase 1 of the browser implementation of the Slight LISP interpreter.

## Quick Start

1. Build the TypeScript code:
```bash
npm run build
# or
tsc
```

2. Open `index.html` in a modern browser (Chrome 90+, Firefox 88+, Safari 14+)

3. Start writing LISP code! The browser interface includes:
   - Interactive code editor
   - Run button (or use Ctrl+Enter / Cmd+Enter)
   - Example programs
   - Syntax-highlighted output

## What's Included

### ✅ Working Features
- Core LISP functionality (arithmetic, comparisons, boolean operations)
- List operations (list, head, tail, cons, empty?)
- Map data structures (make-map, map-get, map-set!, etc.)
- Function definitions (def, fun)
- Anonymous functions and closures
- Lexical scoping with let bindings
- Conditionals (cond)
- Variable mutation (set!)
- Exception handling (try/catch/throw)
- JSON operations (json-parse, json-stringify)
- Macros (defmacro) - Note: Macros only persist within single evaluation

### ❌ Not Available in Browser
These Node.js-specific features have been removed:
- File operations (read-file, write-file!, delete-file!, file-exists?)
- Path operations (resolve-path)
- System operations (get-env, exit)
- Process/actor system (spawn, send, recv, self, kill, processes)
- Include functionality

## Architecture

The browser implementation consists of:

1. **`src/Slight/CoreInterpreter.ts`** - Base interpreter with common functionality
2. **`src/Slight/BrowserInterpreter.ts`** - Browser interpreter extending CoreInterpreter
3. **`src/Slight/MacroExpander.ts`** - Shared macro expander with parameterized interpreter
4. **`src/browser.ts`** - Browser entry point and convenience functions
5. **`index.html`** - Interactive web interface

The core pipeline architecture remains unchanged:
```
Code → Tokenizer → Parser → MacroExpander → Interpreter → Output
```

## Usage in Your Own Projects

After building, you can use the browser version in your own HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Slight App</title>
</head>
<body>
    <script type="module">
        import { evaluate } from './js/src/browser.js';

        async function runCode() {
            const { results, errors } = await evaluate(`
                (def factorial (fun (n)
                    (cond
                        ((== n 0) 1)
                        (true (* n (factorial (- n 1)))))))
                (factorial 5)
            `);

            console.log('Results:', results); // [true, 120]
            console.log('Errors:', errors);   // []
        }

        runCode();
    </script>
</body>
</html>
```

## Advanced Usage

For more control, you can use the individual pipeline components:

```javascript
import {
    BrowserSlight,
    StringSource,
    ArrayOutput
} from './js/src/browser.js';

const input = new StringSource('(+ 1 2 3)');
const output = new ArrayOutput();
const slight = new BrowserSlight(input, output);

await slight.run();
console.log(output.results); // [6]
```

## Testing

The implementation has been tested with:
- Basic arithmetic and operations
- Function definitions and calls
- List and map operations
- Error handling
- The removal of Node.js-specific functions

## Next Steps

This is Phase 1 of the browser migration. Future phases could add:

- **Phase 2**: Persistent REPL state across evaluations
- **Phase 3**: Web Workers for process/actor system
- **Phase 4**: Virtual file system with localStorage/IndexedDB
- **Phase 5**: Browser-based test suite

## Browser Compatibility

Requires modern browsers with support for:
- ES2020+ features (async/await, generators)
- ES Modules
- Map and Set objects
- Promise API

Tested with:
- Chrome 90+
- Firefox 88+
- Safari 14+

## Development

To modify the browser version:

1. Edit TypeScript files in `src/` (especially `BrowserInterpreter.ts` and `browser.ts`)
2. Run `tsc` to compile
3. Reload `index.html` in your browser

The compiled JavaScript files are in the `js/` directory (gitignored).