
## Browser Terminal UI - IMPLEMENTED ✅

A visual multi-window terminal interface for the browser process system.

### Implemented Features

**Terminal Windows**
- Terminal-style UI with input at bottom, log scrolling upward
- Green-on-black color scheme (#00cc00 on #000000)
- Modern monospace fonts (SF Mono, Monaco, Inconsolata, Fira Code, Consolas)
- Clean, minimal design without excessive glow effects
- Tight line spacing (1.3) for maximum log visibility

**Window Management**
- Draggable windows (drag from header bar)
- Resizable windows (drag from bottom-right resize handle)
- Main window: 600x450px
- Spawned windows: 450x300px (smaller)
- Smart positioning: new windows appear to the right or below parent
- Click-to-focus with active state highlighting

**Process Visualization**
- Window title shows: `PID: X (Parent: Y)` or `PID: 0 (Main)`
- Each window connected to its own BrowserInterpreter instance
- Mailbox indicator (📬) appears when messages are waiting
- Windows turn red when process is killed/terminated
- Close button (✕) appears on terminated windows

**REPL Features**
- Command history per window (↑/↓ arrow keys)
- Color-coded output (prompts, results, errors, info)
- Each window maintains independent interpreter state
- Results and errors displayed inline with evaluation

### Usage Example

```lisp
; In main window (PID: 0)
(def worker (fun () (begin (send 0 "Hello!") (recv))))
(def pid (spawn worker))

; New window appears for PID: 1 (Parent: 0)
; Mailbox indicator lights up on main window

(recv)  ; Get message in main window
(send pid "Reply!")  ; Send back to worker

(kill pid)  ; Window turns red, shows [PROCESS TERMINATED]
; Click "✕ Close" to remove the window
```

### Files Modified
- `index.html` - Complete terminal UI implementation with WindowManager
- Visual styles, drag/resize handlers, history support, mailbox polling

---

## Future Enhancement Ideas

**Minimize Button**
- Shrink window height to 3 lines of log output + input area
- Clicking minimize again expands back to previous height
- Useful for monitoring many processes at once

**Other Ideas**
- Window snapping/tiling
- Saved window layouts
- Minimize to taskbar
- Window opacity controls
- Custom color themes
