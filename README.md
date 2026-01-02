# Slight

```
   _____ ___       __    __
  / ___// (_)___ _/ /_  / /_
  \__ \/ / / __ `/ __ \/ __/
 ___/ / / / /_/ / / / / /_
/____/_/_/\__, /_/ /_/\__/
         /____/
```

A Lisp-like interpreter with a reified CEK machine and pluggable async effect 
handlers.

## Status

This is very much a work in progress, everything described here works to some 
degree or another.

## Overview

Slight implements a continuation-passing style interpreter where machine state
(control, environment, continuation) is explicit and manipulable. Effects are
handled uniformly through a `HOST` continuation that pauses execution and
yields to external handlers.

## Effect Handlers

### IO

Provides `(print <string>)`, `(readline)` for basic input/output. Along with an 
interactive `(repl)` that can be triggered at any time during evaluation. 

### AI

Provides an `(ai-repl <prompt>)` that calls out to an LLM for agent-driven 
REPL evaluation. 

## Building

```bash
npx tsc                                # compile to js/
node --test js/tests/001-basic.test.js # run basic tests
# or use the playgroun test to experiment
node --test js/tests/999-playground.test.js 
```

## Language

S-expressions with FExprs (operatives receive arguments unevaluated) and
applicatives (arguments evaluated before application).

```lisp
(defun (factorial n)
    (if (== n 0)
        1
        (* n (factorial (- n 1)))))

(defun (adder x)
    (lambda (y) (+ x y)))

((adder 10) 20) 
```

## License

MIT
