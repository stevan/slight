# Profiling Guide for Slight Interpreter

This guide covers various approaches to profile the Slight interpreter and measure the overhead of the async generator pipeline architecture.

## Quick Start

### Run the benchmark script
```bash
npm run build
node js/benchmarks/pipeline-overhead.js
```

This will show you timing breakdowns for each pipeline stage and identify where time is spent.

---

## Profiling Approaches

### 1. Built-in Benchmark Scripts

#### Pipeline Overhead (`benchmarks/pipeline-overhead.ts`)

Measures async generator pipeline overhead:
- Full pipeline execution time
- Individual stage performance (Tokenizer, Parser, MacroExpander, Interpreter)
- Direct AST evaluation (bypassing pipeline)
- Overhead percentages for each stage

**Usage:**
```bash
npm run bench
```

**What it tells you:**
- Where time is spent in the pipeline
- Async generator overhead vs direct execution (~20x)
- Performance of different code patterns

#### Memory Usage (`benchmarks/memory-usage.ts`)

Tracks heap allocations and garbage collection:
- Memory usage with/without interpreter reuse
- Heap growth patterns over many iterations
- Allocation behavior

**Usage:**
```bash
npm run bench:memory
```

**What it tells you:**
- Interpreter reuse saves ~80% memory
- Minimal heap growth indicates no leaks
- GC effectiveness

#### Process System (`benchmarks/process-system.ts`)

Comprehensive process performance analysis:
- Process spawn overhead (simple, with small state, with large state)
- Message passing throughput and latency
- Concurrent process scaling (10, 100, 1000 processes)
- Memory overhead per process

**Usage:**
```bash
npm run bench:process
```

**Key findings:**
- Process spawn: ~0.018ms (55K+ spawns/sec)
- Copy-on-write optimization: 41x speedup for spawning with large state
- Message passing: 250K+ messages/sec
- Linear scaling up to 1000+ concurrent processes
- Memory: ~0.16 KB per process

---

### 2. Node.js CPU Profiler (V8 Profiler)

Node.js has a built-in CPU profiler that generates `.cpuprofile` files viewable in Chrome DevTools.

**Usage:**
```bash
npm run build
node --cpu-prof js/benchmarks/pipeline-overhead.js

# This generates a .cpuprofile file
# Open Chrome DevTools → More Tools → JavaScript Profiler → Load
```

**What it tells you:**
- Function call tree with time percentages
- Hot paths in your code
- Time spent in async generator machinery vs actual work

**Advanced options:**
```bash
# Profile with custom interval (default 1ms)
node --cpu-prof --cpu-prof-interval=100 js/bin/slight.js program.sl

# Profile with custom output directory
node --cpu-prof --cpu-prof-dir=./profiles js/bin/slight.js program.sl
```

---

### 3. Chrome DevTools Inspector

Use Chrome DevTools for interactive profiling with breakpoints and timeline.

**Usage:**
```bash
npm run build
node --inspect-brk js/benchmarks/pipeline-overhead.js

# Then open chrome://inspect in Chrome
# Click "inspect" on your Node.js process
# Go to "Profiler" or "Performance" tab
```

**What it tells you:**
- Real-time CPU and memory usage
- Interactive flame graphs
- Step-by-step execution with breakpoints
- Async stack traces

---

### 4. Clinic.js Suite

Clinic.js provides advanced performance diagnostics for Node.js applications.

**Installation:**
```bash
npm install -g clinic
```

**Usage:**

#### Clinic Doctor (Overall performance)
```bash
clinic doctor -- node js/benchmarks/pipeline-overhead.js
```
Detects event loop issues, I/O problems, and CPU bottlenecks.

#### Clinic Flame (CPU profiling)
```bash
clinic flame -- node js/benchmarks/pipeline-overhead.js
```
Generates interactive flame graphs showing where CPU time is spent.

#### Clinic BubbleProf (Async operations)
```bash
clinic bubbleprof -- node js/benchmarks/pipeline-overhead.js
```
Visualizes async operations and helps identify async bottlenecks.

**What it tells you:**
- Event loop delay (important for async generators)
- Async operation bottlenecks
- Visual flame graphs

---

### 5. Performance Hooks API

For fine-grained custom profiling, use Node.js `perf_hooks` module.

**Example:**
```typescript
import { performance, PerformanceObserver } from 'node:perf_hooks';

// Mark key points
performance.mark('tokenizer-start');
const tokens = tokenizer.run(stringSource(code));
performance.mark('tokenizer-end');

performance.mark('parser-start');
const asts = parser.run(tokens);
performance.mark('parser-end');

// Measure intervals
performance.measure('tokenizer', 'tokenizer-start', 'tokenizer-end');
performance.measure('parser', 'parser-start', 'parser-end');

// Log measurements
const observer = new PerformanceObserver((items) => {
    items.getEntries().forEach((entry) => {
        console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
    });
});
observer.observe({ entryTypes: ['measure'] });
```

**What it tells you:**
- Precise timing of specific code sections
- Custom metrics for your use case
- Low overhead measurement

---

### 6. Memory Profiling

To understand memory usage and garbage collection impact:

**Heap snapshots:**
```bash
node --inspect-brk js/bin/slight.js program.sl
# In Chrome DevTools → Memory → Take Heap Snapshot
```

**Track allocations:**
```bash
node --trace-gc js/benchmarks/pipeline-overhead.js
```

**Generate heap profile:**
```bash
node --heap-prof js/benchmarks/pipeline-overhead.js
# Generates a .heapprofile file
# Load in Chrome DevTools → Memory → Load
```

**What it tells you:**
- Memory allocation patterns
- Garbage collection frequency and duration
- Memory leaks or excessive allocations

---

## Understanding Async Generator Overhead

The Slight interpreter uses an async generator pipeline:
```
Input → Tokenizer → Parser → MacroExpander → Interpreter → Output
```

### Sources of overhead:

1. **Generator state machine**: Each `yield` creates a promise and suspends/resumes execution
2. **Pipeline composition**: Data flows through 4 stages, each with its own generator
3. **Memory allocation**: Each stage creates intermediate data structures
4. **Async coordination**: `for await` loops coordinate async iteration

### Measuring the overhead:

Compare these approaches in the benchmark script:

**Full pipeline:**
```typescript
const tokens = tokenizer.run(stringSource(code));
const asts = parser.run(tokens);
const expanded = macroExpander.run(asts);
for await (const output of interpreter.run(expanded)) {
    // Process output
}
```

**Direct evaluation:**
```typescript
const ast = new CallNode(...); // Pre-constructed AST
const result = await ast.evaluate(interpreter, new Map());
```

The difference shows the pipeline overhead.

---

## Optimization Strategies

If profiling reveals async generator overhead is significant:

### 1. Batch Processing
Process multiple tokens/AST nodes together instead of one at a time:
```typescript
async *run(source: TokenStream): ASTStream {
    const batch: Token[] = [];
    for await (const token of source) {
        batch.push(token);
        if (batch.length >= 100) {
            yield* this.processBatch(batch);
            batch.length = 0;
        }
    }
}
```

### 2. Synchronous Fast Path
For simple cases, bypass async machinery:
```typescript
async *run(source: TokenStream): ASTStream {
    for await (const token of source) {
        if (this.isSimpleToken(token)) {
            yield this.parseSynchronously(token); // No await needed
        } else {
            yield await this.parseAsync(token);
        }
    }
}
```

### 3. Caching
Cache parsed ASTs or macro expansions:
```typescript
private astCache = new Map<string, ASTNode>();

async *run(source: TokenStream): ASTStream {
    for await (const token of source) {
        const key = this.getCacheKey(token);
        if (this.astCache.has(key)) {
            yield this.astCache.get(key)!;
        } else {
            const ast = await this.parse(token);
            this.astCache.set(key, ast);
            yield ast;
        }
    }
}
```

### 4. Compile Mode
For production, compile to a single synchronous pass:
```typescript
// Development: Full pipeline with all stages
// Production: Single-pass compiled execution
```

---

## Benchmarking Best Practices

1. **Warmup**: Run iterations before measuring to let JIT compile
2. **Isolate**: Measure one thing at a time
3. **Repeat**: Run multiple iterations and calculate averages
4. **Realistic workloads**: Profile real Slight programs, not just micro-benchmarks
5. **Compare**: Measure before/after optimization changes

---

## Example Profiling Session

```bash
# 1. Run benchmark to identify bottlenecks
npm run build && node js/benchmarks/pipeline-overhead.js

# 2. Generate CPU profile
node --cpu-prof js/benchmarks/pipeline-overhead.js

# 3. Analyze in Chrome DevTools
# Open chrome://inspect → Load .cpuprofile file

# 4. For async-specific issues, use clinic
clinic bubbleprof -- node js/bin/slight.js large-program.sl

# 5. Memory profiling
node --heap-prof js/bin/slight.js large-program.sl
```

---

## Interpreting Results

### Expected overhead ranges:

- **Tokenizer**: 10-20% of total time (lexical analysis)
- **Parser**: 20-30% of total time (AST construction)
- **MacroExpander**: 5-10% of total time (when macros used)
- **Interpreter**: 40-60% of total time (evaluation + builtins)

If you see:
- **Tokenizer > 30%**: Optimize regex patterns or character processing
- **Parser > 40%**: Optimize AST node creation or reduce allocations
- **Interpreter < 30%**: Pipeline overhead is too high relative to actual work

### Async generator overhead indicators:

- High time in `next()`, `Promise` constructor, or microtask queue
- Many small allocations from generator state machines
- High event loop delay in clinic doctor

---

## Case Study: Copy-on-Write Optimization

### The Problem

Initial profiling of the process system revealed that spawning processes with parent state was extremely expensive:

```
BEFORE optimization:
Spawn (simple code)      0.019ms →  52,762 spawns/sec
Spawn (with small state) 0.050ms →  20,149 spawns/sec  (+161% slower)
Spawn (with large state) 0.733ms →   1,365 spawns/sec  (+3,766% slower!)
```

The bottleneck was in `ProcessRuntime.ts:112-115` and `CoreInterpreter.ts:623-627`, where we cloned three Maps on every spawn:

```typescript
// BEFORE: Expensive cloning
if (parentState) {
    slight.interpreter.functions = new Map(parentState.functions);
    slight.interpreter.macros = new Map(parentState.macros);
    slight.interpreter.bindings = new Map(parentState.bindings);
}
```

For 200 items (100 vars + 100 funcs), this added 0.714ms of pure cloning overhead.

### The Solution: Prototype Chain

Implemented copy-on-write using parent environment references:

1. **Added parent fields** to `CoreInterpreter.ts`:
```typescript
public parentFunctions?: Map<string, { params: string[], body: ASTNode }>;
public parentMacros?: Map<string, { params: string[], body: ASTNode }>;
public parentBindings?: Map<string, any>;
```

2. **Added lookup helpers** that check local first, then parent:
```typescript
getFunction(name: string) {
    if (this.functions.has(name)) return this.functions.get(name);
    return this.parentFunctions?.get(name);
}
```

3. **Updated AST nodes** to use helpers instead of direct Map access
4. **Modified ProcessRuntime** to pass references instead of cloning

### The Results

```
AFTER optimization:
Spawn (simple code)      0.018ms →  55,155 spawns/sec
Spawn (with small state) 0.028ms →  35,747 spawns/sec  (+54% slower)
Spawn (with large state) 0.018ms →  55,710 spawns/sec  (-1% slower!)
```

**41x speedup** for spawning with large state! State inheritance is now essentially free.

### Key Insights

1. **Profiling revealed the bottleneck**: Without benchmarks, we wouldn't have known cloning was the issue
2. **Classic optimization pattern**: Copy-on-write is a well-known technique for this exact problem
3. **Correctness preserved**: All 188 tests still pass - isolation is maintained
4. **Minimal code changes**: Added helper methods, updated call sites, removed cloning
5. **Massive impact**: From 1,365 → 55,710 spawns/sec with 200-item environments

This demonstrates the value of:
- **Measuring first**: Know where the time is actually spent
- **Thinking about the model**: Share-nothing doesn't require cloning if writes are local
- **Validating with tests**: Optimization + tests = confidence

---

## Additional Resources

- [Node.js Performance Best Practices](https://nodejs.org/docs/latest/api/perf_hooks.html)
- [V8 Profiling Guide](https://v8.dev/docs/profile)
- [Clinic.js Documentation](https://clinicjs.org/documentation/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
