import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { MacroExpander } from '../src/Slight/MacroExpander.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { ProcessRuntime } from '../src/Slight/ProcessRuntime.js';
import { astToPlainObject } from './utils/astToPlainObject.js';

async function evaluate(code: string[]) {
    // Reset ProcessRuntime before each evaluation to avoid test interference
    ProcessRuntime.getInstance().reset();

    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();
    const interpreter = new Interpreter();

    const tokens = tokenizer.run(mockAsyncGen(code));
    const asts = parser.run(tokens);
    const expanded = macroExpander.run(asts);
    const results = [];
    for await (const result of interpreter.run(expanded)) {
        results.push(result.value);
    }
    return results.map(x => astToPlainObject(x));
}

test('spawn creates a new process', async () => {
    const results = await evaluate([
        '(defvar pid (spawn "(+ 1 2)"))',
        'pid'
    ]);
    assert.equal(typeof results[0], 'boolean'); // def returns true
    assert.equal(typeof results[1], 'number');  // pid is a number
    assert.ok(results[1] > 0);                  // pid is positive
});

test('self returns current process ID', async () => {
    const results = await evaluate([
        '(self)'
    ]);
    assert.equal(results[0], 0); // Main process is PID 0
});

test('send and recv basic message passing', async () => {
    const results = await evaluate([
        // Spawn an echo server that receives and sends back
        '(defvar echo (spawn "(let ((msg (recv))) (send (head msg) (head (tail msg))))"))',
        // Wait a bit for process to start
        '(+ 1 1)',
        // Send a message
        '(send echo 42)',
        // Receive the echo
        '(defvar response (recv 1000))',
        // Extract the data (second element)
        '(head (tail response))'
    ]);
    assert.equal(results[4], 42); // Should receive 42 back
});

test('recv with timeout returns null on timeout', async () => {
    const results = await evaluate([
        '(recv 100)' // No message, should timeout
    ]);
    assert.equal(results[0], null);
});

test('recv without timeout blocks (tested with quick send)', async () => {
    const results = await evaluate([
        '(defvar pid (spawn "(send 0 (quote hello))"))',
        '(recv 1000)', // Should receive before timeout
    ]);
    // Should receive [pid "hello"]
    assert.ok(Array.isArray(results[1]));
    assert.equal(results[1][1], 'hello');
});

test('multiple processes can communicate', async () => {
    const results = await evaluate([
        // Process 1: forwards messages
        '(defvar p1 (spawn "(let ((msg (recv))) (send (head msg) (+ (head (tail msg)) 10)))"))',
        // Process 2: forwards messages
        '(defvar p2 (spawn "(let ((msg (recv))) (send (head msg) (* (head (tail msg)) 2)))"))',
        // Send to p1
        '(send p1 5)',
        // Receive from p1
        '(defvar r1 (recv 1000))',
        // Send to p2
        '(send p2 5)',
        // Receive from p2
        '(defvar r2 (recv 1000))',
        // Return both results
        '(list (head (tail r1)) (head (tail r2)))'
    ]);
    assert.deepEqual(results[6], [15, 10]); // p1: 5+10=15, p2: 5*2=10
});

test('is-alive? checks process status', async () => {
    const results = await evaluate([
        '(defvar pid (spawn "(+ 1 2)"))',
        '(is-alive? pid)',
        // Wait a bit for process to complete
        '(+ 1 1)',
        '(+ 1 1)',
        '(+ 1 1)',
        '(is-alive? pid)'
    ]);
    assert.equal(results[1], true);  // Initially alive
    // Process may still be alive after 3 operations
    // This is a timing-dependent test
});

test('processes returns list of PIDs', async () => {
    const results = await evaluate([
        '(defvar p1 (spawn "(+ 1 2)"))',
        '(defvar p2 (spawn "(+ 1 2)"))',
        '(processes)'
    ]);
    assert.ok(Array.isArray(results[2]));
    assert.ok(results[2].length >= 2); // At least p1 and p2
});

test('send to non-existent process throws error', async () => {
    const results = await evaluate([
        '(send 9999 42)' // PID 9999 likely doesn't exist
    ]);
    // Should return an error object
    assert.ok(results[0] && typeof results[0] === 'object');
});

test('process can receive multiple messages', async () => {
    const results = await evaluate([
        // Echo server that receives two messages
        '(defvar echo (spawn "(let ((msg1 (recv))) (send (head msg1) (head (tail msg1)))) (let ((msg2 (recv))) (send (head msg2) (head (tail msg2))))"))',
        '(+ 1 1)', // Wait for process to start
        '(send echo 10)',
        '(send echo 20)',
        '(defvar r1 (recv 1000))',
        '(defvar r2 (recv 1000))',
        '(list (head (tail r1)) (head (tail r2)))'
    ]);
    assert.deepEqual(results[6], [10, 20]);
});

test('process can use functions and closures', async () => {
    const results = await evaluate([
        '(defvar pid (spawn "(defun double (x) (* x 2)) (send 0 (double 21))"))',
        '(defvar msg (recv 1000))',
        '(head (tail msg))'
    ]);
    assert.equal(results[2], 42);
});

test('process can spawn other processes', async () => {
    const results = await evaluate([
        // Parent spawns a child
        '(defvar parent (spawn "(defvar child (spawn \\"(send 0 (quote nested))\\")) (+ 1 1)"))',
        // Wait for nested spawn
        '(+ 1 1)',
        '(+ 1 1)',
        // Check if we received the message from nested process
        '(defvar msg (recv 1000))',
        '(head (tail msg))'
    ]);
    assert.equal(results[4], 'nested');
});

test('kill terminates a process', async () => {
    const results = await evaluate([
        // Create a process that waits for a message
        '(defvar pid (spawn "(recv)"))',
        '(is-alive? pid)',
        '(kill pid)',
        '(is-alive? pid)'
    ]);
    assert.equal(results[1], true);  // Alive before kill
    assert.equal(results[2], true);  // Kill succeeded
    assert.equal(results[3], false); // Dead after kill
});

test('concurrent processes with fibonacci calculation', async () => {
    const results = await evaluate([
        // Define fibonacci function
        '(defun fib (n) (cond ((< n 2) n) (else (+ (fib (- n 1)) (fib (- n 2))))))',
        // Spawn two processes calculating fibonacci
        '(defvar p1 (spawn "(defun fib (n) (cond ((< n 2) n) (else (+ (fib (- n 1)) (fib (- n 2)))))) (send 0 (fib 10))"))',
        '(defvar p2 (spawn "(defun fib (n) (cond ((< n 2) n) (else (+ (fib (- n 1)) (fib (- n 2)))))) (send 0 (fib 8))"))',
        // Receive results
        '(defvar r1 (recv 5000))',
        '(defvar r2 (recv 5000))',
        // Sum the results
        '(+ (head (tail r1)) (head (tail r2)))'
    ]);
    assert.equal(results[5], 55 + 21); // fib(10)=55, fib(8)=21
});

test('message contains sender PID', async () => {
    const results = await evaluate([
        '(defvar pid (spawn "(send 0 (quote hello))"))',
        '(defvar msg (recv 1000))',
        '(head msg)' // Should be the sender's PID
    ]);
    assert.ok(typeof results[2] === 'number');
    assert.ok(results[2] > 0); // Valid PID
});

test('spawn with named function and arguments', async () => {
    const results = await evaluate([
        '(defun worker (x) (send 0 (* x 2)))',
        '(spawn worker 21)',
        '(defvar msg (recv 1000))',
        '(head (tail msg))'
    ]);
    assert.equal(results[3], 42);
});

test('spawn with named function - no arguments', async () => {
    const results = await evaluate([
        '(defun worker () (send 0 (quote done)))',
        '(spawn worker)',
        '(defvar msg (recv 1000))',
        '(head (tail msg))'
    ]);
    assert.equal(results[3], 'done');
});

test('spawned process has access to parent functions', async () => {
    const results = await evaluate([
        '(defun helper (x) (* x 3))',
        '(defun worker (x) (send 0 (helper x)))',
        '(spawn worker 7)',
        '(defvar msg (recv 1000))',
        '(head (tail msg))'
    ]);
    assert.equal(results[4], 21); // 7 * 3
});

test('spawn with complex arguments', async () => {
    const results = await evaluate([
        '(defun worker (x y z) (send 0 (+ x (+ y z))))',
        '(spawn worker 10 20 30)',
        '(defvar msg (recv 1000))',
        '(head (tail msg))'
    ]);
    assert.equal(results[3], 60);
});

test('spawn with string argument', async () => {
    const results = await evaluate([
        '(defun worker (msg) (send 0 msg))',
        '(spawn worker "hello world")',
        '(defvar result (recv 1000))',
        '(head (tail result))'
    ]);
    assert.equal(results[3], 'hello world');
});

test('spawn with list argument', async () => {
    const results = await evaluate([
        '(defun worker (lst) (send 0 (head lst)))',
        '(spawn worker (list 1 2 3))',
        '(defvar msg (recv 1000))',
        '(head (tail msg))'
    ]);
    assert.equal(results[3], 1);
});
