# Bytecode VM Design for Slight

**Status**: Design Proposal
**Date**: 2025-10
**Purpose**: Eliminate async overhead for synchronous code while preserving the elegant pipeline architecture

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Integration](#architecture-integration)
3. [Bytecode Instruction Set](#bytecode-instruction-set)
4. [Compiler Design](#compiler-design)
5. [VM Implementation](#vm-implementation)
6. [GPU Integration](#gpu-integration)
7. [Optimization Opportunities](#optimization-opportunities)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Performance Expectations](#performance-expectations)
10. [Examples](#examples)

---

## Overview

### The Problem

The current AST interpreter uses async evaluation (`async evaluate()`), which creates Promise overhead even for simple synchronous operations:

```typescript
// Current: (+ 1 2) takes ~0.012ms
await CallNode.evaluate()
  → await elements[0].evaluate()    // Promise overhead
  → await Promise.all([...])        // Promise overhead
  → await func(...args)             // Promise overhead
```

This is **400x slower** than raw JavaScript for simple arithmetic, even though most Slight operations are purely synchronous.

### The Solution

Introduce a bytecode compiler and virtual machine that:

1. **Compiles AST to compact bytecode** at parse time
2. **Detects sync vs async at compile time** (no runtime checks needed)
3. **Executes sync code without Promises** (near-native speed)
4. **Upgrades to async only when needed** (processes, GPU, I/O)
5. **Preserves the pipeline architecture** (Compiler and VM are async generators)

### Key Insight

The VM can make smart execution decisions based on bytecode analysis:

```typescript
execute(bytecode: Bytecode): any {
    // Scan bytecode for async opcodes
    if (bytecode.hasAsync) {
        return this.executeAsync(bytecode);  // Return Promise
    }

    // Pure synchronous execution - no Promises!
    return this.executeSync(bytecode);  // Return value directly
}
```

**Result**: Zero Promise overhead for sync code, same async support for everything else.

---

## Architecture Integration

### Pipeline Remains Intact

The bytecode VM slots perfectly into the existing async generator pipeline:

```typescript
// Before (Current)
Input → Tokenizer → Parser → MacroExpander → Interpreter → Output

// After (With VM)
Input → Tokenizer → Parser → MacroExpander → Compiler → VM → Output
```

**Key properties preserved:**
- ✅ Each stage is an async generator
- ✅ Composable and testable
- ✅ Error propagation through pipeline
- ✅ Backpressure and streaming
- ✅ Process system unchanged
- ✅ GPU integration unchanged

### Type Flow

```typescript
type SourceStream   = AsyncGenerator<string>;
type TokenStream    = AsyncGenerator<Token | PipelineError>;
type ASTStream      = AsyncGenerator<ASTNode | PipelineError>;
type BytecodeStream = AsyncGenerator<Bytecode | PipelineError>;  // NEW
type OutputStream   = AsyncGenerator<OutputToken>;
```

The Compiler emits `Bytecode` objects, which the VM consumes. Both remain async generators, maintaining the pipeline's composability.

---

## Bytecode Instruction Set

### Design Philosophy

Inspired by Perl 5's VM:
- **High-level opcodes** (not CPU-like)
- **Rich value types** (numbers, strings, lists, closures)
- **Pragmatic, not academic** (optimize common cases)
- **Easy to optimize** (compiler passes, JIT opportunities)

### Core Opcodes (35 total)

```typescript
enum OpCode {
    // ===== Stack Operations (5) =====
    CONST = 0,              // Push constant: CONST <index>
    LOAD = 1,               // Load variable: LOAD <name>
    STORE = 2,              // Store variable: STORE <name>
    POP = 3,                // Pop stack top
    DUP = 4,                // Duplicate stack top

    // ===== Arithmetic (Sync) (6) =====
    ADD = 10,               // Add N values: ADD <count>
    SUB = 11,               // Subtract: SUB <count>
    MUL = 12,               // Multiply: MUL <count>
    DIV = 13,               // Divide: DIV
    MOD = 14,               // Modulo: MOD
    NEG = 15,               // Negate: NEG

    // ===== Comparison (Sync) (6) =====
    LT = 20,                // Less than: LT
    GT = 21,                // Greater than: GT
    LE = 22,                // Less or equal: LE
    GE = 23,                // Greater or equal: GE
    EQ = 24,                // Equal: EQ
    NE = 25,                // Not equal: NE

    // ===== Boolean (Sync) (3) =====
    AND = 30,               // Logical AND: AND <count>
    OR = 31,                // Logical OR: OR <count>
    NOT = 32,               // Logical NOT: NOT

    // ===== List Operations (Sync) (5) =====
    LIST_NEW = 40,          // Create list: LIST_NEW <count>
    LIST_HEAD = 41,         // Get first element: LIST_HEAD
    LIST_TAIL = 42,         // Get rest: LIST_TAIL
    LIST_CONS = 43,         // Prepend element: LIST_CONS
    LIST_GET = 44,          // Get nth element: LIST_GET

    // ===== Control Flow (5) =====
    JUMP = 50,              // Unconditional jump: JUMP <offset>
    JUMP_IF_FALSE = 51,     // Jump if false: JUMP_IF_FALSE <offset>
    CALL = 52,              // Call function: CALL <name> <argcount>
    TAIL_CALL = 53,         // Tail call optimization: TAIL_CALL <name>
    RETURN = 54,            // Return from function: RETURN

    // ===== Function Definition (3) =====
    DEF_FUNCTION = 60,      // Define function: DEF_FUNCTION <metadata>
    CLOSURE = 61,           // Create closure: CLOSURE <metadata>
    LOAD_PARAM = 62,        // Load parameter: LOAD_PARAM <index>

    // ===== Async Operations (5) =====
    CALL_ASYNC = 70,        // Call async builtin: CALL_ASYNC <name>
    SPAWN = 71,             // Spawn process: SPAWN
    SEND = 72,              // Send message: SEND
    RECV = 73,              // Receive message: RECV
    AWAIT = 74,             // Await result: AWAIT

    // ===== GPU Operations (3) =====
    GPU_DISPATCH = 80,      // Dispatch GPU kernel: GPU_DISPATCH
    GPU_CREATE_BUFFER = 81, // Create GPU buffer: GPU_CREATE_BUFFER
    GPU_READ_BUFFER = 82,   // Read GPU buffer: GPU_READ_BUFFER

    // ===== Special (2) =====
    NOP = 254,              // No operation
    HALT = 255              // Stop execution
}
```

### Instruction Structure

```typescript
interface Instruction {
    opcode: OpCode;
    arg?: any;              // Immediate value, name, or offset
    line?: number;          // Source line (for debugging)
    column?: number;        // Source column (for debugging)
}

interface Bytecode {
    instructions: Instruction[];
    constants: any[];                    // Constant pool
    functions: Map<string, number>;      // Function entry points
    metadata: {
        hasAsync: boolean;               // Contains async opcodes?
        source?: string;                 // Original source (optional)
        version: string;                 // Bytecode version
    };
}
```

### Async Opcode Detection

The compiler marks bytecode as async if it contains any of:
- `SPAWN`, `SEND`, `RECV` (Process operations)
- `CALL_ASYNC` (Async builtins like `timer/sleep`, `net/fetch`)
- `GPU_DISPATCH`, `GPU_READ_BUFFER` (GPU operations)
- `AWAIT` (Explicit await points)

The VM checks this flag once and routes to sync or async execution path.

---

## Compiler Design

### AST to Bytecode Transformation

```typescript
export class Compiler {
    private bytecode: Bytecode;
    private scopeDepth: number = 0;
    private loopStack: number[] = [];     // For break/continue
    private asyncOpcodes: Set<OpCode> = new Set([
        OpCode.SPAWN, OpCode.RECV, OpCode.SEND,
        OpCode.CALL_ASYNC, OpCode.GPU_DISPATCH, OpCode.GPU_READ_BUFFER
    ]);

    async *run(source: ASTStream): AsyncGenerator<Bytecode, void, void> {
        for await (const node of source) {
            if (isPipelineError(node)) {
                yield node as any;
                continue;
            }

            // Reset for new expression
            this.bytecode = this.createBytecode();

            // Compile AST node
            this.compileNode(node);

            // Mark if async
            this.bytecode.metadata.hasAsync = this.detectAsync();

            // Yield compiled bytecode
            yield this.bytecode;
        }
    }

    private compileNode(node: ASTNode): void {
        if (node instanceof NumberNode) {
            this.emitConst(node.value);
        }
        else if (node instanceof StringNode) {
            this.emitConst(node.value);
        }
        else if (node instanceof BooleanNode) {
            this.emitConst(node.value);
        }
        else if (node instanceof SymbolNode) {
            this.emit(OpCode.LOAD, node.name);
        }
        else if (node instanceof CallNode) {
            this.compileCall(node);
        }
        else if (node instanceof DefNode) {
            this.compileDef(node);
        }
        else if (node instanceof CondNode) {
            this.compileCond(node);
        }
        else if (node instanceof LetNode) {
            this.compileLet(node);
        }
        else if (node instanceof BeginNode) {
            this.compileBegin(node);
        }
        else if (node instanceof QuoteNode) {
            this.compileQuote(node);
        }
        // ... more node types
    }

    private detectAsync(): boolean {
        return this.bytecode.instructions.some(instr =>
            this.asyncOpcodes.has(instr.opcode)
        );
    }
}
```

### Compilation Examples

#### Simple Arithmetic: `(+ 1 2 3)`

```typescript
// AST
CallNode([
    SymbolNode('+'),
    NumberNode(1),
    NumberNode(2),
    NumberNode(3)
])

// Bytecode
[
    { opcode: CONST, arg: 0 },      // Push 1
    { opcode: CONST, arg: 1 },      // Push 2
    { opcode: CONST, arg: 2 },      // Push 3
    { opcode: ADD, arg: 3 }         // Add 3 values
]
// Constants: [1, 2, 3]
// hasAsync: false
```

#### Conditional: `(cond ((< x 10) "small") (true "big"))`

```typescript
// Bytecode
[
    { opcode: LOAD, arg: 'x' },     // 0: Load x
    { opcode: CONST, arg: 0 },      // 1: Push 10
    { opcode: LT },                 // 2: x < 10
    { opcode: JUMP_IF_FALSE, arg: 7 }, // 3: Jump to else if false
    { opcode: CONST, arg: 1 },      // 4: Push "small"
    { opcode: JUMP, arg: 8 },       // 5: Jump to end
    { opcode: CONST, arg: 2 },      // 7: Push "big"
    { opcode: HALT }                // 8: End
]
// Constants: [10, "small", "big"]
// hasAsync: false
```

#### Async Operation: `(spawn worker)`

```typescript
// Bytecode
[
    { opcode: LOAD, arg: 'worker' },    // Load worker function
    { opcode: SPAWN }                   // Spawn process (async!)
]
// hasAsync: true  ← VM will use executeAsync()
```

### Optimization Passes

The compiler can perform optimizations before emitting final bytecode:

#### Constant Folding

```typescript
// Before: (+ 1 2)
[CONST 1, CONST 2, ADD 2]

// After: (optimized)
[CONST 3]
```

#### Dead Code Elimination

```typescript
// Before: (cond (true x) (false y))
[CONST true, JUMP_IF_FALSE 5, LOAD x, JUMP 6, LOAD y]

// After: (optimized - false branch removed)
[LOAD x]
```

#### Tail Call Optimization

```typescript
// Before: (def loop (n) (loop (- n 1)))
[LOAD loop, LOAD n, CONST 1, SUB, CALL loop]

// After: (optimized - tail call)
[LOAD n, CONST 1, SUB, STORE n, TAIL_CALL loop]
// VM reuses stack frame!
```

---

## VM Implementation

### Dual Execution Paths

The VM has two execution engines:

```typescript
export class VM {
    private stack: any[] = [];
    private pc: number = 0;
    private environment: Map<string, any> = new Map();
    private callStack: Frame[] = [];

    async *run(source: AsyncGenerator<Bytecode>): OutputStream {
        for await (const bytecode of source) {
            if (isPipelineError(bytecode)) {
                yield { type: OutputHandle.ERROR, value: bytecode };
                continue;
            }

            try {
                const result = this.execute(bytecode);

                // Handle sync or async result
                if (result instanceof Promise) {
                    yield { type: OutputHandle.STDOUT, value: await result };
                } else {
                    yield { type: OutputHandle.STDOUT, value: result };
                }
            } catch (e) {
                yield { type: OutputHandle.ERROR, value: this.formatError(e) };
            }
        }
    }

    private execute(bytecode: Bytecode): any | Promise<any> {
        // Check async flag (set by compiler)
        if (bytecode.metadata.hasAsync) {
            return this.executeAsync(bytecode);
        }

        // Pure synchronous execution
        return this.executeSync(bytecode);
    }
}
```

### Synchronous Execution (Fast Path)

```typescript
private executeSync(bytecode: Bytecode): any {
    this.reset();
    const instructions = bytecode.instructions;

    while (this.pc < instructions.length) {
        const instr = instructions[this.pc++];

        switch (instr.opcode) {
            case OpCode.CONST:
                this.stack.push(bytecode.constants[instr.arg!]);
                break;

            case OpCode.LOAD: {
                const value = this.environment.get(instr.arg!);
                if (value === undefined) {
                    throw new UndefinedVariableError(instr.arg!);
                }
                this.stack.push(value);
                break;
            }

            case OpCode.STORE:
                this.environment.set(instr.arg!, this.stack[this.stack.length - 1]);
                break;

            case OpCode.ADD: {
                const count = instr.arg!;
                let sum = 0;
                for (let i = 0; i < count; i++) {
                    sum += this.stack.pop();
                }
                this.stack.push(sum);
                break;
            }

            case OpCode.MUL: {
                const count = instr.arg!;
                let product = 1;
                for (let i = 0; i < count; i++) {
                    product *= this.stack.pop();
                }
                this.stack.push(product);
                break;
            }

            case OpCode.LT: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a < b);
                break;
            }

            case OpCode.JUMP:
                this.pc = instr.arg!;
                break;

            case OpCode.JUMP_IF_FALSE:
                if (!this.stack.pop()) {
                    this.pc = instr.arg!;
                }
                break;

            case OpCode.CALL: {
                const funcName = instr.arg!;
                const argCount = this.stack.pop();
                const args = this.stack.splice(-argCount);

                const func = this.getFunction(funcName);
                if (typeof func === 'function') {
                    // Builtin function
                    this.stack.push(func(...args));
                } else {
                    // User function - need to execute its bytecode
                    const result = this.callUserFunction(func, args);
                    this.stack.push(result);
                }
                break;
            }

            case OpCode.RETURN:
                return this.stack.pop();

            case OpCode.LIST_NEW: {
                const count = instr.arg!;
                const list = this.stack.splice(-count);
                this.stack.push(list);
                break;
            }

            case OpCode.LIST_HEAD:
                this.stack.push(this.stack.pop()[0]);
                break;

            case OpCode.LIST_TAIL:
                this.stack.push(this.stack.pop().slice(1));
                break;

            // ... more sync opcodes

            default:
                throw new Error(`Unknown opcode: ${instr.opcode}`);
        }
    }

    // Return top of stack (or null if empty)
    return this.stack.length > 0 ? this.stack.pop() : null;
}
```

### Asynchronous Execution (When Needed)

```typescript
private async executeAsync(bytecode: Bytecode): Promise<any> {
    this.reset();
    const instructions = bytecode.instructions;

    while (this.pc < instructions.length) {
        const instr = instructions[this.pc++];

        switch (instr.opcode) {
            // All sync cases same as executeSync()...
            case OpCode.CONST:
            case OpCode.LOAD:
            case OpCode.STORE:
            case OpCode.ADD:
            // ... (same implementations)

            // Async-specific cases
            case OpCode.CALL_ASYNC: {
                const funcName = instr.arg!;
                const argCount = this.stack.pop();
                const args = this.stack.splice(-argCount);

                const func = this.getFunction(funcName);
                const result = await func(...args);  // Await here!
                this.stack.push(result);
                break;
            }

            case OpCode.SPAWN: {
                const code = this.stack.pop();
                const runtime = ProcessRuntime.getInstance();
                const pid = await runtime.spawn(code);
                this.stack.push(pid);
                break;
            }

            case OpCode.RECV: {
                const timeout = this.stack.pop();
                const runtime = ProcessRuntime.getInstance();
                const pid = runtime.getCurrentPid(this);
                const message = await runtime.recv(pid, timeout);
                this.stack.push(message);
                break;
            }

            case OpCode.GPU_DISPATCH: {
                const workgroupCount = this.stack.pop();
                const buffers = this.stack.pop();
                const pipeline = this.stack.pop();
                await this.gpuDispatch(pipeline, buffers, workgroupCount);
                break;
            }

            case OpCode.GPU_READ_BUFFER: {
                const buffer = this.stack.pop();
                const data = await this.gpuReadBuffer(buffer);
                this.stack.push(data);
                break;
            }

            // ... more async cases
        }
    }

    return this.stack.length > 0 ? this.stack.pop() : null;
}
```

### Key Performance Properties

1. **No Promise allocation for sync code** - `executeSync()` never creates Promises
2. **No microtask queue overhead** - Direct function calls, not `await`
3. **Stack-based execution** - Simple push/pop operations
4. **Direct array access** - Instructions are just array lookups
5. **Branch prediction friendly** - Switch statement on opcode

---

## GPU Integration

### GPU Operations as Async Opcodes

GPU operations map naturally to async opcodes because they're inherently asynchronous:

```typescript
// Slight code
(def kernel (gpu/create-shader wgsl-code))
(def pipeline (gpu/create-pipeline kernel "main"))
(def result-buffer (gpu/create-buffer 1024))
(gpu/dispatch pipeline (list buf-a buf-b result-buffer) (list 64 64 1))
(def result (gpu/read-buffer result-buffer))
```

### Compiled Bytecode

```typescript
[
    // Create shader
    { opcode: LOAD, arg: 'wgsl-code' },
    { opcode: CALL, arg: 'gpu/create-shader' },
    { opcode: STORE, arg: 'kernel' },

    // Create pipeline
    { opcode: LOAD, arg: 'kernel' },
    { opcode: CONST, arg: 0 },              // "main"
    { opcode: CALL, arg: 'gpu/create-pipeline' },
    { opcode: STORE, arg: 'pipeline' },

    // Create buffer
    { opcode: CONST, arg: 1 },              // 1024
    { opcode: CALL, arg: 'gpu/create-buffer' },
    { opcode: STORE, arg: 'result-buffer' },

    // Dispatch (async!)
    { opcode: LOAD, arg: 'pipeline' },
    { opcode: LOAD, arg: 'buf-a' },
    { opcode: LOAD, arg: 'buf-b' },
    { opcode: LOAD, arg: 'result-buffer' },
    { opcode: LIST_NEW, arg: 3 },
    { opcode: CONST, arg: 2 },              // [64, 64, 1]
    { opcode: GPU_DISPATCH },               // ← Async opcode

    // Read buffer (async!)
    { opcode: LOAD, arg: 'result-buffer' },
    { opcode: GPU_READ_BUFFER },            // ← Async opcode
    { opcode: STORE, arg: 'result' }
]
// hasAsync: true (GPU_DISPATCH and GPU_READ_BUFFER are async)
```

### VM GPU Support

```typescript
// In VM class
private gpuDevice?: GPUDevice;
private gpuContext?: {
    device: GPUDevice;
    adapter: GPUAdapter;
};

async initGPU(): Promise<void> {
    if (!navigator.gpu) {
        console.warn('WebGPU not available');
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No GPU adapter');

    const device = await adapter.requestDevice();
    this.gpuDevice = device;
    this.gpuContext = { device, adapter };
}

// Async execution handles GPU operations
case OpCode.GPU_DISPATCH: {
    if (!this.gpuDevice) {
        throw new Error('GPU not initialized');
    }

    const workgroupCount = this.stack.pop();  // [x, y, z]
    const buffers = this.stack.pop();         // Array of GPUBuffer
    const pipeline = this.stack.pop();        // GPUComputePipeline

    const device = this.gpuDevice;

    // Create bind group
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: buffers.map((buffer: GPUBuffer, i: number) => ({
            binding: i,
            resource: { buffer }
        }))
    });

    // Dispatch compute work
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(
        workgroupCount[0],
        workgroupCount[1],
        workgroupCount[2]
    );
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    await device.queue.onSubmittedWorkDone();  // Async!

    break;
}

case OpCode.GPU_READ_BUFFER: {
    const buffer = this.stack.pop() as GPUBuffer;

    // Create staging buffer
    const stagingBuffer = this.gpuDevice.createBuffer({
        size: buffer.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    // Copy GPU buffer to staging
    const commandEncoder = this.gpuDevice.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(
        buffer, 0,
        stagingBuffer, 0,
        buffer.size
    );
    this.gpuDevice.queue.submit([commandEncoder.finish()]);

    // Read data
    await stagingBuffer.mapAsync(GPUMapMode.READ);  // Async!
    const data = new Float32Array(stagingBuffer.getMappedRange());
    const result = Array.from(data);

    stagingBuffer.unmap();
    stagingBuffer.destroy();

    this.stack.push(result);
    break;
}
```

### Optimization: CPU Fallback

If GPU is unavailable, operations can fall back to fast CPU code:

```typescript
case OpCode.GPU_DISPATCH: {
    if (!this.gpuDevice) {
        // Fallback to CPU execution
        // Could use WASM for performance
        const result = this.cpuFallback(pipeline, buffers);
        this.stack.push(result);
        break;
    }
    // ... GPU path
}
```

### High-Level Tensor Operations

For convenience, high-level operations can compile to bytecode:

```typescript
// Slight code
(tensor/matmul tensor-a tensor-b)

// Compiles to bytecode that:
// 1. Checks if tensors are on GPU
// 2. Moves to GPU if needed
// 3. Dispatches matmul kernel
// 4. Returns result tensor
[
    { opcode: LOAD, arg: 'tensor-a' },
    { opcode: LOAD, arg: 'tensor-b' },
    { opcode: CALL_ASYNC, arg: 'tensor/matmul' }  // ← Async builtin
]
```

The `tensor/matmul` builtin handles all GPU details internally, but the VM knows it's async and routes to `executeAsync()`.

---

## Optimization Opportunities

### 1. Constant Folding

```typescript
// Before
(+ 1 2)  →  [CONST 1, CONST 2, ADD 2]

// After optimization
3  →  [CONST 3]
```

### 2. Dead Code Elimination

```typescript
// Before
(cond (true x) (false y))

// After optimization (false branch removed)
x
```

### 3. Tail Call Optimization

```typescript
// Before
(def loop (n) (loop (- n 1)))
→  [LOAD loop, LOAD n, CONST 1, SUB, CALL loop]

// After optimization
→  [LOAD n, CONST 1, SUB, STORE n, TAIL_CALL loop]
// VM reuses stack frame - no stack overflow!
```

### 4. Inlining

```typescript
// Before
(def add1 (x) (+ x 1))
(add1 5)

// After inlining
(+ 5 1)
```

### 5. Peephole Optimization

```typescript
// Before
[LOAD x, STORE x]  // Load then immediately store - no-op

// After
[]  // Remove redundant operations
```

### 6. Register Allocation

Future optimization: instead of stack-based, use register-based VM:

```typescript
// Stack-based (current)
[CONST 1, CONST 2, ADD]

// Register-based (future)
[LOAD_IMM r0 1, LOAD_IMM r1 2, ADD r2 r0 r1]
// Faster for complex expressions
```

### 7. JIT to WASM

For hot functions, compile bytecode to WASM:

```typescript
class JIT {
    compileToWASM(bytecode: Bytecode): WebAssembly.Module {
        // Bytecode → WASM
        // Even faster than VM!
    }
}

// VM detects hot function
if (callCount > 1000 && !jitCache.has(funcName)) {
    const wasmModule = jit.compileToWASM(funcBytecode);
    jitCache.set(funcName, wasmModule);
}
```

---

## Implementation Roadmap

### Phase 1: Basic VM (Weeks 1-2)

**Goal**: Execute simple arithmetic and variables

**Tasks**:
- Design bytecode instruction set (30 opcodes)
- Implement `Bytecode` class (instruction container)
- Implement `Compiler` class (AST → Bytecode for simple nodes)
- Implement `VM.executeSync()` (stack machine)
- Support: numbers, variables, arithmetic, comparisons

**Test cases**:
```lisp
(+ 1 2)           → 3
(* (+ 1 2) 3)     → 9
(def x 10)        → x = 10
(+ x 5)           → 15
(< x 20)          → true
```

**Deliverable**: Simple expressions work via bytecode VM

---

### Phase 2: Control Flow (Week 3)

**Goal**: Conditionals and function calls

**Tasks**:
- Add `JUMP`, `JUMP_IF_FALSE` opcodes
- Compile `CondNode` to conditional jumps
- Add `CALL`, `RETURN` opcodes
- Implement function calls (builtin and user-defined)
- Handle parameter binding

**Test cases**:
```lisp
(cond ((< x 10) "small") (true "big"))
(def add (a b) (+ a b))
(add 3 4)        → 7
```

**Deliverable**: Functions and conditionals work

---

### Phase 3: Async Support (Week 4)

**Goal**: Handle async operations (processes, GPU, I/O)

**Tasks**:
- Mark async opcodes (`SPAWN`, `RECV`, `CALL_ASYNC`)
- Implement `VM.executeAsync()`
- Add `hasAsync` detection in compiler
- Integrate with `ProcessRuntime`
- Test process spawning via bytecode

**Test cases**:
```lisp
(def worker (fun () (+ 1 2)))
(def pid (spawn worker))
(send pid 5)
(recv)
```

**Deliverable**: Process system works with bytecode VM

---

### Phase 4: Lists and Closures (Week 5)

**Goal**: Support list operations and lexical closures

**Tasks**:
- Add list opcodes (`LIST_NEW`, `LIST_HEAD`, `LIST_TAIL`, `LIST_CONS`)
- Compile `LetNode` to proper scoping
- Implement closures (capture environment)
- Add `CLOSURE` opcode

**Test cases**:
```lisp
(list 1 2 3)            → [1, 2, 3]
(head (list 1 2 3))     → 1
(def make-adder (x) (fun (y) (+ x y)))
(def add5 (make-adder 5))
(add5 10)               → 15
```

**Deliverable**: Full functional programming support

---

### Phase 5: Optimization (Week 6-7)

**Goal**: Make it fast

**Tasks**:
- Constant folding pass
- Dead code elimination
- Tail call optimization
- Peephole optimization
- Benchmark and profile

**Test cases**:
```lisp
(+ 1 2)                       → [CONST 3]  (folded)
(def fib (n) (cond ((< n 2) n) (true (+ (fib (- n 1)) (fib (- n 2))))))
(fib 30)                      → < 10ms (tail-call optimized)
```

**Deliverable**: 20-40x speedup over current interpreter

---

### Phase 6: GPU Integration (Week 8)

**Goal**: GPU operations via bytecode

**Tasks**:
- Add GPU opcodes (`GPU_DISPATCH`, `GPU_CREATE_BUFFER`, etc.)
- Implement GPU operations in `executeAsync()`
- Mark GPU builtins as async
- Test WebGPU integration

**Test cases**:
```lisp
(def kernel (gpu/create-shader wgsl-code))
(def pipeline (gpu/create-pipeline kernel "main"))
(gpu/dispatch pipeline buffers workgroups)
```

**Deliverable**: GPU operations work seamlessly

---

### Phase 7: Debugging & Tooling (Week 9+)

**Goal**: Developer experience

**Tasks**:
- Bytecode disassembler
- Source map (bytecode → source line)
- Debugger support (breakpoints, step through)
- Performance profiler (hot function detection)
- Bytecode serialization (save/load compiled code)

**Deliverable**: Full development toolchain

---

## Performance Expectations

### Comparison: AST Interpreter vs Bytecode VM

| Operation | AST Interpreter | Bytecode VM | Improvement |
|-----------|----------------|-------------|-------------|
| Simple arithmetic `(+ 1 2)` | 0.012ms | 0.0003ms | **40x faster** |
| Complex expression `(* (+ 1 2) (- 5 3))` | 0.035ms | 0.001ms | **35x faster** |
| Fibonacci(30) | 150ms | 8ms | **18x faster** |
| Function call overhead | 0.008ms | 0.0002ms | **40x faster** |
| Conditional evaluation | 0.015ms | 0.0005ms | **30x faster** |
| List operations | 0.010ms | 0.0004ms | **25x faster** |
| **Async operations** | | | |
| Process spawn | 0.018ms | 0.018ms | Same |
| Message passing | 0.004ms | 0.004ms | Same |
| GPU dispatch | 0.5ms | 0.5ms | Same |

**Key insight**: Synchronous operations get 20-40x faster, async operations unchanged (already optimal).

### Memory Usage

| Aspect | AST Interpreter | Bytecode VM |
|--------|----------------|-------------|
| Code representation | Large AST tree (~5KB per expression) | Compact bytecode (~200 bytes) |
| Runtime overhead | High (Promise allocations) | Low (stack + PC) |
| Serialization | Difficult (AST is tree) | Easy (bytecode is array) |

### With Future JIT to WASM

| Operation | VM | VM + WASM JIT | Native JS |
|-----------|-----|---------------|-----------|
| Fibonacci(30) | 8ms | 4ms | 3ms |
| Matrix multiply | 50ms | 12ms | 10ms |

WASM JIT gets within **20% of native performance** for hot code.

---

## Examples

### Example 1: Simple Expression

**Slight code**:
```lisp
(* (+ 1 2) (+ 3 4))
```

**AST** (current):
```typescript
CallNode([
    SymbolNode('*'),
    CallNode([SymbolNode('+'), NumberNode(1), NumberNode(2)]),
    CallNode([SymbolNode('+'), NumberNode(3), NumberNode(4)])
])
```

**Bytecode** (new):
```typescript
Instructions:
  0: CONST 0          ; Push 1
  1: CONST 1          ; Push 2
  2: ADD 2            ; Add → 3
  3: CONST 2          ; Push 3
  4: CONST 3          ; Push 4
  5: ADD 2            ; Add → 7
  6: MUL 2            ; Multiply → 21

Constants: [1, 2, 3, 4]
hasAsync: false
```

**Execution trace**:
```
PC  Opcode      Stack
0   CONST 0     [1]
1   CONST 1     [1, 2]
2   ADD 2       [3]
3   CONST 2     [3, 3]
4   CONST 3     [3, 3, 4]
5   ADD 2       [3, 7]
6   MUL 2       [21]
```

**Performance**:
- AST: 0.035ms (3 async calls, 6 Promises)
- VM: 0.001ms (7 instructions, pure sync)
- **35x faster**

---

### Example 2: Conditional

**Slight code**:
```lisp
(def check (x)
  (cond
    ((< x 0) "negative")
    ((== x 0) "zero")
    (true "positive")))
```

**Bytecode**:
```typescript
Function 'check' at offset 0:
  0: LOAD_PARAM 0      ; Load x
  1: CONST 0           ; Push 0
  2: LT                ; x < 0?
  3: JUMP_IF_FALSE 7   ; If false, jump to next clause
  4: CONST 1           ; Push "negative"
  5: RETURN
  6: JUMP 18           ; Jump to end
  7: LOAD_PARAM 0      ; Load x
  8: CONST 0           ; Push 0
  9: EQ                ; x == 0?
 10: JUMP_IF_FALSE 14  ; If false, jump to else
 11: CONST 2           ; Push "zero"
 12: RETURN
 13: JUMP 18           ; Jump to end
 14: CONST 3           ; Push "positive"
 15: RETURN

Constants: [0, "negative", "zero", "positive"]
hasAsync: false
```

**After optimization** (with constant folding):
```typescript
Function 'check' (optimized):
  0: LOAD_PARAM 0      ; Load x
  1: CONST 0           ; Push 0
  2: LT                ; x < 0?
  3: JUMP_IF_FALSE 6
  4: CONST 1           ; "negative"
  5: RETURN
  6: LOAD_PARAM 0
  7: CONST 0
  8: EQ
  9: JUMP_IF_FALSE 12
 10: CONST 2           ; "zero"
 11: RETURN
 12: CONST 3           ; "positive"
 13: RETURN

; Optimizations applied:
; - Removed unnecessary jumps
; - Inlined constants
```

---

### Example 3: Recursive Function (Tail Call Optimized)

**Slight code**:
```lisp
(def sum-to (n acc)
  (cond
    ((< n 1) acc)
    (true (sum-to (- n 1) (+ acc n)))))

(sum-to 1000000 0)  ; Should not stack overflow!
```

**Bytecode** (with tail call optimization):
```typescript
Function 'sum-to':
  0: LOAD_PARAM 0       ; Load n
  1: CONST 0            ; Push 1
  2: LT                 ; n < 1?
  3: JUMP_IF_FALSE 6    ; If false, jump to else
  4: LOAD_PARAM 1       ; Load acc
  5: RETURN             ; Return acc
  6: LOAD_PARAM 0       ; Load n
  7: CONST 0            ; Push 1
  8: SUB                ; n - 1
  9: STORE_PARAM 0      ; Store back to n (reuse param slot)
 10: LOAD_PARAM 1       ; Load acc
 11: LOAD_PARAM 0       ; Load n (original value)
 12: ADD                ; acc + n
 13: STORE_PARAM 1      ; Store back to acc
 14: TAIL_CALL sum-to   ; Tail call - reuse stack frame!

; VM handles TAIL_CALL by:
; - Not creating new stack frame
; - Reusing parameter slots
; - Jumping back to function start
; → No stack overflow, even for 1M iterations!
```

---

### Example 4: Async Process Communication

**Slight code**:
```lisp
(def worker (fun ()
  (begin
    (def msg (recv))
    (send (head msg) (* (head (tail msg)) 2)))))

(def pid (spawn worker))
(send pid 21)
(recv)  ; Waits for response
```

**Bytecode**:
```typescript
Worker function:
  0: RECV               ; Async! Wait for message
  1: STORE msg
  2: LOAD msg
  3: LIST_HEAD
  4: LOAD msg
  5: LIST_TAIL
  6: LIST_HEAD
  7: CONST 0            ; Push 2
  8: MUL
  9: SEND               ; Async! Send message
 10: RETURN

Constants: [2]
hasAsync: true  ← VM uses executeAsync()

Main:
  0: LOAD worker
  1: SPAWN              ; Async! Spawn process
  2: STORE pid
  3: LOAD pid
  4: CONST 1            ; Push 21
  5: SEND               ; Async!
  6: RECV               ; Async! Wait for response
  7: RETURN

hasAsync: true
```

**VM execution**:
1. `SPAWN` creates new process with worker bytecode
2. `SEND` puts message in process mailbox
3. `RECV` in worker suspends until message arrives
4. `SEND` in worker sends result back
5. `RECV` in main suspends until response

All async operations handled seamlessly by `executeAsync()`.

---

### Example 5: GPU Matrix Multiply

**Slight code**:
```lisp
(def matmul-gpu (a b size)
  (begin
    ; Create buffers
    (def buf-a (gpu/create-buffer (* size size 4)))
    (def buf-b (gpu/create-buffer (* size size 4)))
    (def buf-result (gpu/create-buffer (* size size 4)))

    ; Write data
    (gpu/write-buffer buf-a a)
    (gpu/write-buffer buf-b b)

    ; Create shader
    (def shader (gpu/create-shader matmul-wgsl))
    (def pipeline (gpu/create-pipeline shader "matmul"))

    ; Dispatch
    (gpu/dispatch pipeline (list buf-a buf-b buf-result) (list 64 64 1))

    ; Read result
    (gpu/read-buffer buf-result)))
```

**Bytecode** (simplified):
```typescript
  0: LOAD size
  1: DUP
  2: MUL
  3: CONST 0            ; 4
  4: MUL
  5: CALL gpu/create-buffer
  6: STORE buf-a

  ; ... same for buf-b and buf-result

 20: LOAD buf-a
 21: LOAD a
 22: CALL gpu/write-buffer  ; Sync (just copies data)

 30: LOAD matmul-wgsl
 31: CALL gpu/create-shader
 32: STORE shader

 40: LOAD shader
 41: CONST 1            ; "matmul"
 42: CALL gpu/create-pipeline
 43: STORE pipeline

 50: LOAD pipeline
 51: LOAD buf-a
 52: LOAD buf-b
 53: LOAD buf-result
 54: LIST_NEW 3
 55: CONST 2            ; [64, 64, 1]
 56: GPU_DISPATCH       ; Async! Dispatch to GPU

 60: LOAD buf-result
 61: GPU_READ_BUFFER    ; Async! Read from GPU
 62: RETURN

hasAsync: true  ; Contains GPU_DISPATCH and GPU_READ_BUFFER
```

**Performance**:
- 1024x1024 matrix multiply
- AST interpreter: ~9ms (includes async overhead)
- Bytecode VM: ~9ms (same - GPU is the bottleneck)
- GPU speedup over CPU: ~600x

VM doesn't make GPU faster, but eliminates overhead in CPU code around GPU calls.

---

## Conclusion

The bytecode VM approach offers the best of all worlds:

1. **Preserves pipeline architecture** - Compiler and VM are async generators
2. **Eliminates async overhead** - Sync code runs 20-40x faster
3. **Supports all features** - Processes, GPU, macros work unchanged
4. **Opens optimization opportunities** - Constant folding, TCO, JIT
5. **High-level and pragmatic** - Like Perl 5, not academic
6. **Future-proof** - Can add JIT, WASM backend, etc.

This is a natural evolution of the Slight interpreter that preserves its elegant design while dramatically improving performance for synchronous operations.

**Next steps**: Explore the language and AST further, then begin implementation when ready.
