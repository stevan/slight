# Slight LISP - Browser Version

The browser implementation of Slight features a **visual multi-window terminal UI** that displays concurrent processes as interactive terminal windows.

## Quick Start

1. Build the TypeScript code:
```bash
npm run build
# or
tsc
```

2. Serve with a local HTTP server:
```bash
npx http-server -p 8080
# or
python3 -m http.server 8080
```

3. Open `http://localhost:8080` in a modern browser (Chrome 90+, Firefox 88+, Safari 14+)

4. Start coding! The terminal UI features:
   - **Multiple draggable windows** - One per process
   - **Command history** - Use ↑/↓ arrow keys
   - **Resizable windows** - Drag from bottom-right corner
   - **Process visualization** - Window titles show PID and parent PID
   - **Mailbox indicators** - 📬 appears when messages arrive
   - **Process state** - Windows turn red when terminated

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
- Macros (defmacro) - Persists within each window's interpreter
- **Process/actor system with visual windows** - Full Erlang-style concurrency with multi-window terminal UI!

### ❌ Not Available in Browser
These Node.js-specific features have been removed:
- File operations (read-file, write-file!, delete-file!, file-exists?)
- Path operations (resolve-path)
- System operations (get-env, exit)
- Include functionality

## Architecture

The browser implementation consists of:

1. **`src/Slight/CoreInterpreter.ts`** - Base interpreter with common functionality
2. **`src/Slight/BrowserInterpreter.ts`** - Browser interpreter extending CoreInterpreter
3. **`src/Slight/MacroExpander.ts`** - Shared macro expander with parameterized interpreter
4. **`src/Slight/ProcessRuntime.ts`** - Promise-based process system (works in browser!)
5. **`src/Slight/AsyncQueue.ts`** - Async message queue for process communication
6. **`src/browser.ts`** - Browser entry point and convenience functions
7. **`index.html`** - Interactive web interface

The core pipeline architecture remains unchanged:
```
Code → Tokenizer → Parser → MacroExpander → Interpreter → Output
```

### Process System in Browser

The browser version now includes the full Erlang-style actor model process system:
- **Concurrent processes** - Multiple interpreters running in parallel using Promise-based scheduling
- **Message passing** - Send and receive messages between processes
- **Process isolation** - Each process has its own interpreter state (share-nothing model)
- **Process management** - Spawn, kill, and monitor processes

Note: Browser processes are concurrent but not parallel (they run in the same JavaScript thread). This is still useful for I/O-bound operations and building reactive systems.

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

## Terminal UI Features

### Window Management
- **Draggable**: Click and drag window header to reposition
- **Resizable**: Drag from bottom-right corner to resize
- **Focus management**: Click any window to bring it to front
- **Smart positioning**: Spawned windows appear to the right or below parent
- **Window sizes**: Main window (600x450), spawned windows (450x300)

### Process Visualization
- **Window titles**: Shows `PID: X (Parent: Y)` for spawned processes, `PID: 0 (Main)` for main
- **Mailbox indicator**: 📬 emoji pulses when messages are waiting in mailbox
- **Process state**: Windows turn red when process is terminated/killed
- **Close button**: ✕ Close button appears on terminated windows

### REPL Features
- **Command history**: ↑/↓ arrows to navigate previous commands per window
- **Color-coded output**: Prompts (green), results (bright green), errors (red), info (yellow)
- **Tight spacing**: Maximized log visibility with 1.3 line-height
- **Scrollable output**: Automatic scrolling with custom styled scrollbar

### Terminal UI Example

```lisp
; Main window starts at PID 0
(self)  ; Returns 0

; Define a worker that sends and waits
(def worker (fun () (begin (send 0 "Started!") (recv))))

; Spawn creates a new window!
(def pid (spawn worker))

; Notice the mailbox indicator 📬 appears
(recv)  ; Returns (1 "Started!")

; Send a reply
(send pid "Continue!")

; Check running processes
(processes)  ; Returns (0 1)

; Kill the worker
(kill pid)
; Worker window turns red and shows [PROCESS TERMINATED]
; Click the ✕ Close button to remove it
```

## Next Steps

Future enhancements could include:

- **Web Workers**: True parallel process execution
- **Virtual file system**: localStorage/IndexedDB-backed file operations
- **Output routing**: Display process output in its own window
- **Process inspector**: Debug panel showing process state and messages
- **Custom themes**: User-configurable terminal colors

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