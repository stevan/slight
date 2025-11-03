# Method Syntax Change: `method` → `:method-name`

## Context

We're refactoring the Slight language to have cleaner OOP syntax. We've already completed:
- ✅ Split `def` into `defun` (functions) and `defvar` (variables)
- ✅ Changed `class` to `defclass`
- ✅ Changed `init` to `INIT` (uppercase to emphasize it's special)

## Goal

Change method definition syntax to match method call syntax for perfect symmetry:

**Current:**
```lisp
(defclass Counter (count)
  (INIT (n) (set! count n))
  (method increment () (set! count (+ count 1)))
  (method get () count))

(def c (new Counter 0))
(c :increment)  ; ← Method calls already use :
```

**Target:**
```lisp
(defclass Counter (count)
  (INIT (n) (set! count n))
  (:increment () (set! count (+ count 1)))
  (:get () count))

(def c (new Counter 0))
(c :increment)  ; ← Perfect symmetry!
```

## Implementation Steps

### 1. Update Parser (src/Slight/Parser.ts)

**Location:** Around line 432, in the `defclass` parsing logic

**Current code:**
```typescript
} else if (methodKeyword.name === 'method') {
    // (method name (params...) body)
    if (!(methodDef.elements[1] instanceof SymbolNode)) {
        throw new Error('Invalid defclass syntax: method name must be a symbol');
    }
    if (!(methodDef.elements[2] instanceof CallNode)) {
        throw new Error('Invalid defclass syntax: method parameters must be a list');
    }
    const methodName = methodDef.elements[1].name;
    const params = methodDef.elements[2].elements.map((el: any) => {
        if (!(el instanceof SymbolNode)) {
            throw new Error('Invalid defclass syntax: method parameters must be symbols');
        }
        return el.name;
    });
    methods.set(methodName, { params, body: methodDef.elements[3] });
}
```

**Target logic:**
```typescript
} else if (methodKeyword.name.startsWith(':')) {
    // (:method-name (params...) body)
    // The method name is the keyword name without the ':'
    const methodName = methodKeyword.name.substring(1); // Remove ':'

    if (!(methodDef.elements[1] instanceof CallNode)) {
        throw new Error('Invalid defclass syntax: method parameters must be a list');
    }
    const params = methodDef.elements[1].elements.map((el: any) => {
        if (!(el instanceof SymbolNode)) {
            throw new Error('Invalid defclass syntax: method parameters must be symbols');
        }
        return el.name;
    });
    methods.set(methodName, { params, body: methodDef.elements[2] });
}
```

**Key changes:**
- Check if `methodKeyword.name.startsWith(':')` instead of checking for `'method'`
- Extract method name by removing the ':' prefix: `methodKeyword.name.substring(1)`
- Body is now at `methodDef.elements[2]` (not `elements[3]`) since we removed the extra name element
- Update error messages to mention `:method-name` syntax

**Error message updates:**
- Change: `"method must be (method name (params...) body) or (INIT (params...) body)"`
- To: `"method must be (:method-name (params...) body) or (INIT (params...) body)"`

- Change: `"expected method or INIT keyword"`
- To: `"expected :method-name or INIT keyword"`

### 2. Update All Class Definitions

**Files to update:**
- All `.sl` files in `lib/` (especially `lib/Actor.sl`)
- All `.sl` files in `t/` (test files)
- Test files in `tests/` and `js/tests/`

**Pattern to find:**
```bash
grep -r "(method " --include="*.sl" --include="*.js" --include="*.ts" lib/ t/ tests/ js/tests/
```

**Conversion pattern:**
```
(method method-name (params...) body)
→
(:method-name (params...) body)
```

**Example conversions:**
```lisp
# Before:
(method increment () (set! count (+ count 1)))
(method get-value () value)
(method add (x) (+ value x))

# After:
(:increment () (set! count (+ count 1)))
(:get-value () value)
(:add (x) (+ value x))
```

### 3. Conversion Script

Create a script `scripts/convert-methods.js` to automate conversion:

```javascript
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function convertMethodsInString(code) {
    let result = '';
    let i = 0;
    let changed = false;

    while (i < code.length) {
        // Look for "(method "
        if (code.substring(i, i + 8) === '(method ') {
            // Found method definition
            let j = i + 8;

            // Skip whitespace
            while (j < code.length && /\s/.test(code[j])) j++;

            // Extract method name
            const nameStart = j;
            while (j < code.length && /[a-zA-Z0-9_\-?!*+/<>=]/.test(code[j])) j++;
            const methodName = code.substring(nameStart, j);

            // Replace with new syntax
            result += '(:' + methodName + ' ';
            changed = true;
            i = j; // Continue from after method name
        } else {
            result += code[i];
            i++;
        }
    }

    return { result, changed };
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { result, changed } = convertMethodsInString(content);

    if (changed) {
        fs.writeFileSync(filePath, result, 'utf-8');
        return true;
    }
    return false;
}

function walkDir(dir, extensions) {
    const files = fs.readdirSync(dir);
    let changedCount = 0;

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (file === 'node_modules') continue;
            changedCount += walkDir(filePath, extensions);
        } else if (extensions.some(ext => file.endsWith(ext))) {
            if (processFile(filePath)) {
                console.log(`Updated: ${filePath}`);
                changedCount++;
            }
        }
    }

    return changedCount;
}

const rootDir = path.join(__dirname, '..');
const dirs = ['js/tests', 'tests', 'lib', 't'];
const extensions = ['.js', '.ts', '.sl'];

console.log('Converting (method name ...) to (:name ...)');
console.log('='.repeat(60));

let totalChanged = 0;
for (const dir of dirs) {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
        console.log(`\nProcessing ${dir}/...`);
        const changed = walkDir(fullPath, extensions);
        totalChanged += changed;
    }
}

console.log('\n' + '='.repeat(60));
console.log(`Total files changed: ${totalChanged}`);
```

### 4. Testing Strategy

After making changes:

1. **Build TypeScript:**
   ```bash
   npm run build
   ```

2. **Run conversion script:**
   ```bash
   node scripts/convert-methods.js
   ```

3. **Verify key files manually:**
   ```bash
   # Check Actor.sl
   grep -A2 "(:.*(" lib/Actor.sl | head -20

   # Check test files
   grep "(method \|(:.*(" t/012-classes.sl
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Check for any remaining `(method ` patterns:**
   ```bash
   grep -r "(method " --include="*.sl" --include="*.js" --include="*.ts" lib/ t/ tests/ js/tests/
   ```

### 5. Expected Test Results

- Should maintain ~220 passing tests
- The same 3 closure-related failures may remain (unrelated to this change)
- No new failures should be introduced

### 6. Verification Examples

**Test that method calls still work:**
```bash
npm run slight -e '
(defclass Counter (count)
  (INIT (n) (set! count n))
  (:increment () (set! count (+ count 1)))
  (:get () count))

(defvar c (new Counter 10))
(c :increment)
(c :get)
'
# Should output: 11
```

**Test Actor library:**
```bash
npm run slight -e '
(include "lib/Actor.sl")

(defclass Counter (count)
  (INIT (n) (set! count n))
  (:increment () (set! count (+ count 1)))
  (:get () count))

(defvar counter (actor/new "Counter" 10))
(call counter "increment")
(call counter "get")
'
# Should output: 11
```

## Summary of Language Changes

After this refactoring, the Slight language will have:

**Definitional Keywords (all prefixed with `def`):**
- `defvar` - Define variables
- `defun` - Define functions
- `defmacro` - Define macros
- `defclass` - Define classes

**Class Syntax:**
- `INIT` - Constructor (uppercase emphasizes uniqueness)
- `:method-name` - Method definitions (matches call syntax perfectly)

**Perfect Symmetry:**
```lisp
; Definition
(:increment () (set! count (+ count 1)))

; Call
(obj :increment)
```

The `:` becomes a consistent visual marker for "this is OOP/method-related".

## Notes

- Method names should support the full Slight identifier character set: `a-zA-Z0-9_\-?!*+/<>=`
- The `:` prefix is ONLY for methods in class definitions and method calls
- Regular symbols should NOT start with `:` outside of OOP context
- Variadic methods should continue to work: `(:add (. nums) ...)`

## Common Issues to Watch For

1. **Multi-line method definitions** - Make sure the parser correctly handles newlines
2. **Comments** - Don't accidentally convert comments containing `(method`
3. **String literals** - Don't convert method syntax inside strings (test carefully!)
4. **Actor library** - This file has many class definitions, verify carefully

Good luck! This should be a cleaner refactoring than the def→defun/defvar split since methods are only used in class definitions.
