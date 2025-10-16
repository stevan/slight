import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tokenizer } from '../src/Slight/Tokenizer.js';
import { Parser } from '../src/Slight/Parser.js';
import { Interpreter } from '../src/Slight/Interpreter.js';
import { astToPlainObject } from './utils/astToPlainObject.js';
import * as fs from 'fs';
import * as path from 'path';

// Helper to ensure tmp directories exist
const ensureTmpDirs = () => {
    const tmpBase = path.resolve('tmp');
    const tmpLib = path.join(tmpBase, 'lib');
    const tmpTest = path.join(tmpBase, 'test');

    if (!fs.existsSync(tmpBase)) fs.mkdirSync(tmpBase);
    if (!fs.existsSync(tmpLib)) fs.mkdirSync(tmpLib);
    if (!fs.existsSync(tmpTest)) fs.mkdirSync(tmpTest);

    return { tmpBase, tmpLib, tmpTest };
};

test('include resolves files relative to current file', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const { tmpTest } = ensureTmpDirs();

    // Create test files
    const includeFile = path.join(tmpTest, 'include-rel.sl');
    const mainFile = path.join(tmpTest, 'main-rel.sl');

    fs.writeFileSync(includeFile, '(def test-value 42)');
    fs.writeFileSync(mainFile, '(include "include-rel.sl") (test-value)');

    // Set current file to main file location
    interpreter.setCurrentFile(mainFile);

    const input = fs.readFileSync(mainFile, 'utf8');
    const tokens = tokenizer.run(mockAsyncGen([input]));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);

    // Filter out null and true (from def) results
    assert.deepStrictEqual(results.filter(r => r.value !== null && r.value !== true).map(x => x.value), [42]);
});

test('include resolves files from include paths', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const { tmpLib, tmpTest } = ensureTmpDirs();

    // Create library file
    const libFile = path.join(tmpLib, 'test-lib.sl');
    fs.writeFileSync(libFile, '(def lib-value () 123)');

    // Create main file that includes from lib
    const mainFile = path.join(tmpTest, 'main-lib.sl');
    fs.writeFileSync(mainFile, '(include "test-lib.sl") (lib-value)');

    // Set include paths
    interpreter.setIncludePaths([tmpLib]);
    interpreter.setCurrentFile(mainFile);

    const input = fs.readFileSync(mainFile, 'utf8');
    const tokens = tokenizer.run(mockAsyncGen([input]));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);

    assert.deepStrictEqual(results.filter(r => r.value !== null && r.value !== true).map(x => x.value), [123]);
});

test('include fails when file not found', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const input = ['(include "non-existent-file.sl")'];
    const tokens = tokenizer.run(mockAsyncGen(input));
    const asts = parser.run(tokens);

    const results = [];
    for await (const result of interpreter.run(asts)) {
        results.push(result);
    }

    // Should have an error (OutputHandle.ERROR = '💔')
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].type, '💔');
    assert.match(results[0].value.message, /File not found/);
});

test('include detects circular dependencies', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const { tmpTest } = ensureTmpDirs();

    // Create circular dependency: file1 -> file2 -> file1
    const file1 = path.join(tmpTest, 'circular1.sl');
    const file2 = path.join(tmpTest, 'circular2.sl');

    fs.writeFileSync(file1, '(include "circular2.sl")');
    fs.writeFileSync(file2, '(include "circular1.sl")');

    interpreter.setCurrentFile(file1);

    const input = fs.readFileSync(file1, 'utf8');
    const tokens = tokenizer.run(mockAsyncGen([input]));
    const asts = parser.run(tokens);

    const results = [];
    for await (const result of interpreter.run(asts)) {
        results.push(result);
    }

    // Should have an error for circular dependency
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].type, '💔');
    assert.match(results[0].value.message, /Circular dependency detected/);
});

test('include with namespace conventions', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const { tmpLib, tmpTest } = ensureTmpDirs();

    // Create library with namespace
    const mathLib = path.join(tmpLib, 'math.sl');
    fs.writeFileSync(mathLib, '(def math/pi () 3.14159) (def math/double (x) (* x 2))');

    // Create main file that uses namespace
    const mainFile = path.join(tmpTest, 'namespace-test.sl');
    fs.writeFileSync(mainFile, '(include "math.sl") (list (math/pi) (math/double 5))');

    interpreter.setIncludePaths([tmpLib]);
    interpreter.setCurrentFile(mainFile);

    const input = fs.readFileSync(mainFile, 'utf8');
    const tokens = tokenizer.run(mockAsyncGen([input]));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);

    // Filter out null results from definitions
    const nonNullResults = results.filter(r => r.value !== null && r.value !== true);
    assert.deepStrictEqual(nonNullResults.map(x => x.value), [[3.14159, 10]]);
});

test('include with multiple include paths', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const { tmpBase } = ensureTmpDirs();

    // Create multiple library directories
    const lib1 = path.join(tmpBase, 'lib1');
    const lib2 = path.join(tmpBase, 'lib2');
    if (!fs.existsSync(lib1)) fs.mkdirSync(lib1);
    if (!fs.existsSync(lib2)) fs.mkdirSync(lib2);

    // Create files in different lib directories
    fs.writeFileSync(path.join(lib1, 'first.sl'), '(def from-lib1 () "lib1")');
    fs.writeFileSync(path.join(lib2, 'second.sl'), '(def from-lib2 () "lib2")');

    // Create main file
    const mainFile = path.join(tmpBase, 'multi-lib.sl');
    fs.writeFileSync(mainFile, '(include "first.sl") (include "second.sl") (list (from-lib1) (from-lib2))');

    // Set multiple include paths
    interpreter.setIncludePaths([lib1, lib2]);
    interpreter.setCurrentFile(mainFile);

    const input = fs.readFileSync(mainFile, 'utf8');
    const tokens = tokenizer.run(mockAsyncGen([input]));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);

    // Filter out null results from definitions
    const nonNullResults = results.filter(r => r.value !== null && r.value !== true);
    assert.deepStrictEqual(nonNullResults.map(x => x.value), [["lib1", "lib2"]]);
});

test('include preserves global bindings', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const { tmpTest } = ensureTmpDirs();

    // Create included file that defines globals
    const includeFile = path.join(tmpTest, 'globals.sl');
    fs.writeFileSync(includeFile, '(def global-val () 100) (def global-fn (x) (+ x (global-val)))');

    // Create main file that uses globals
    const mainFile = path.join(tmpTest, 'use-globals.sl');
    fs.writeFileSync(mainFile, '(include "globals.sl") (global-fn 50)');

    interpreter.setCurrentFile(mainFile);

    const input = fs.readFileSync(mainFile, 'utf8');
    const tokens = tokenizer.run(mockAsyncGen([input]));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);

    // Filter out null and true results from definitions
    const finalResult = results.filter(r => r.value !== null && r.value !== true);
    assert.deepStrictEqual(finalResult.map(x => x.value), [150]);
});

test('include with FFI operations', async () => {
    async function* mockAsyncGen(items: string[]) { for (const i of items) yield i; }
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const interpreter = new Interpreter();

    const { tmpTest } = ensureTmpDirs();

    // Create file that uses FFI operations
    const ffiFile = path.join(tmpTest, 'ffi-test.sl');
    fs.writeFileSync(ffiFile,
        '(def create-data () ' +
        '(let ((m (make-map)) ' +
        '      (x (map-set! m "key1" 10)) ' +
        '      (y (map-set! m "key2" 20))) ' +
        'm))');

    const mainFile = path.join(tmpTest, 'use-ffi.sl');
    fs.writeFileSync(mainFile,
        '(include "ffi-test.sl") ' +
        '(let ((data (create-data))) ' +
        '(+ (map-get data "key1") (map-get data "key2")))');

    interpreter.setCurrentFile(mainFile);

    const input = fs.readFileSync(mainFile, 'utf8');
    const tokens = tokenizer.run(mockAsyncGen([input]));
    const asts = parser.run(tokens);
    const results = [];
    for await (const result of interpreter.run(asts)) results.push(result);

    // Filter out null and true results
    const finalResult = results.filter(r => r.value !== null && r.value !== true);
    assert.deepStrictEqual(finalResult.map(x => x.value), [30]);
});