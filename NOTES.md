
## UI Idea

Simple terminal like UI window, input at the bottom, log scrolling upwards. 

Very minimal UI, just a simple window. 

The window should be draggable and repositionable. 

Acts as a REPL in the browser. 

When `(spawn)` is called in the REPL, a new window appears which is attached to the new BrowserInterpreter instance. 

Add the PID for the process to the window title, along with the parent pid. 

