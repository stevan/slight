import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CoreInterpreter } from '../../src/Slight/CoreInterpreter.js';
import { CollectingOutputSink, MockPlatform } from '../../src/Slight/Dependencies/index.js';
import { Tokenizer } from '../../src/Slight/Tokenizer.js';
import { Parser } from '../../src/Slight/Parser.js';
import { MacroExpander } from '../../src/Slight/MacroExpander.js';
import { isPipelineError } from '../../src/Slight/Types.js';

/**
 * Helper function to evaluate Slight code with a given interpreter
 */
async function evaluate(interpreter: CoreInterpreter, code: string): Promise<any> {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const macroExpander = new MacroExpander();

    async function* stringSource() {
        yield code;
    }

    const tokens = tokenizer.run(stringSource());
    const ast = parser.run(tokens);
    const expanded = macroExpander.run(ast);

    let lastResult: any = null;
    for await (const node of expanded) {
        if (isPipelineError(node)) {
            throw new Error(`Pipeline error: ${node.message}`);
        }
        lastResult = await node.evaluate(interpreter, new Map());
    }

    return lastResult;
}

test('DI - CollectingOutputSink captures print output', async () => {
    const sink = new CollectingOutputSink();
    const interpreter = new CoreInterpreter({ outputSink: sink });

    await evaluate(interpreter, '(print "Hello" "World")');

    assert.deepEqual(sink.getStdout(), ['Hello World']);
    assert.equal(sink.getStderr().length, 0);
});

test('DI - CollectingOutputSink captures say output with newline', async () => {
    const sink = new CollectingOutputSink();
    const interpreter = new CoreInterpreter({ outputSink: sink });

    await evaluate(interpreter, '(say "Line 1")');
    await evaluate(interpreter, '(say "Line 2")');

    assert.deepEqual(sink.getStdout(), ['Line 1\n', 'Line 2\n']);
});

test('DI - CollectingOutputSink separates stdout and stderr', async () => {
    const sink = new CollectingOutputSink();
    const interpreter = new CoreInterpreter({ outputSink: sink });

    await evaluate(interpreter, '(say "normal output")');
    await evaluate(interpreter, '(log/warn "warning message")');
    await evaluate(interpreter, '(log/error "error message")');

    assert.equal(sink.getStdout().length, 1);
    assert.equal(sink.getStderr().length, 2);
    assert.ok(sink.getStdout()[0].includes('normal output'));
    assert.ok(sink.getStderr()[0].includes('warning'));
    assert.ok(sink.getStderr()[1].includes('error'));
});

test('DI - MockPlatform filesystem operations', async () => {
    const platform = new MockPlatform();
    platform.setFile('/test.txt', 'Hello from mock file!');

    const interpreter = new CoreInterpreter({ platform });

    // Read file
    const content = await evaluate(interpreter, '(fs/read "/test.txt")');
    assert.equal(content, 'Hello from mock file!');

    // Write file
    await evaluate(interpreter, '(fs/write "/output.txt" "New content")');
    assert.equal(platform.getFile('/output.txt'), 'New content');

    // File exists
    const exists = await evaluate(interpreter, '(fs/exists? "/test.txt")');
    assert.equal(exists, true);

    const notExists = await evaluate(interpreter, '(fs/exists? "/missing.txt")');
    assert.equal(notExists, false);
});

test('DI - MockPlatform tracks fetch calls', async () => {
    const platform = new MockPlatform();
    const interpreter = new CoreInterpreter({ platform });

    await evaluate(interpreter, '(net/fetch "https://api.example.com/data")');

    assert.equal(platform.fetchCalls.length, 1);
    assert.equal(platform.fetchCalls[0].url, 'https://api.example.com/data');
});

test('DI - MockPlatform environment variables', async () => {
    const platform = new MockPlatform();
    platform.setEnv('TEST_VAR', 'test_value');
    platform.setEnv('API_KEY', 'secret123');

    const interpreter = new CoreInterpreter({ platform });

    const testVar = await evaluate(interpreter, '(sys/env "TEST_VAR")');
    assert.equal(testVar, 'test_value');

    const apiKey = await evaluate(interpreter, '(sys/env "API_KEY")');
    assert.equal(apiKey, 'secret123');

    const missing = await evaluate(interpreter, '(sys/env "MISSING")');
    assert.equal(missing, null);
});

test('DI - MockPlatform system operations', async () => {
    const platform = new MockPlatform();
    const interpreter = new CoreInterpreter({ platform });

    const platformName = await evaluate(interpreter, '(sys/platform)');
    assert.equal(platformName, 'mock');

    const cwd = await evaluate(interpreter, '(sys/cwd)');
    assert.equal(cwd, '/mock/cwd');

    await evaluate(interpreter, '(sys/chdir! "/new/dir")');
    const newCwd = await evaluate(interpreter, '(sys/cwd)');
    assert.equal(newCwd, '/new/dir');
});

test('DI - Combined mock platform and output sink', async () => {
    const sink = new CollectingOutputSink();
    const platform = new MockPlatform();
    platform.setFile('/config.json', '{"name": "test", "value": 42}');

    const interpreter = new CoreInterpreter({
        outputSink: sink,
        platform: platform
    });

    await evaluate(interpreter, `
        (def config (json/parse (fs/read "/config.json")))
        (say "Config loaded:")
        (say (json/stringify config true))
    `);

    const stdout = sink.getStdout();
    assert.ok(stdout.length >= 2);
    assert.ok(stdout[0].includes('Config loaded'));
});

test('DI - MockPlatform file operations - write, read, delete', async () => {
    const platform = new MockPlatform();
    const sink = new CollectingOutputSink();
    const interpreter = new CoreInterpreter({ platform, outputSink: sink });

    // Write a file
    await evaluate(interpreter, '(fs/write "/data.txt" "Initial data")');
    assert.equal(platform.getFile('/data.txt'), 'Initial data');

    // Append to file
    await evaluate(interpreter, '(fs/append "/data.txt" " + more data")');
    assert.equal(platform.getFile('/data.txt'), 'Initial data + more data');

    // Read it back
    const content = await evaluate(interpreter, '(fs/read "/data.txt")');
    assert.equal(content, 'Initial data + more data');

    // Delete the file
    await evaluate(interpreter, '(fs/delete! "/data.txt")');
    assert.equal(platform.getFile('/data.txt'), undefined);
});

test('DI - MockPlatform file copy and move', async () => {
    const platform = new MockPlatform();
    platform.setFile('/source.txt', 'source content');

    const interpreter = new CoreInterpreter({ platform });

    // Copy file
    await evaluate(interpreter, '(fs/copy! "/source.txt" "/copy.txt")');
    assert.equal(platform.getFile('/copy.txt'), 'source content');
    assert.equal(platform.getFile('/source.txt'), 'source content'); // original still exists

    // Move file
    await evaluate(interpreter, '(fs/move! "/source.txt" "/moved.txt")');
    assert.equal(platform.getFile('/moved.txt'), 'source content');
    assert.equal(platform.getFile('/source.txt'), undefined); // original deleted
});

test('DI - MockPlatform URL encoding/decoding', async () => {
    const platform = new MockPlatform();
    const interpreter = new CoreInterpreter({ platform });

    const encoded = await evaluate(interpreter, '(net/url-encode "hello world")');
    assert.equal(encoded, 'hello%20world');

    const decoded = await evaluate(interpreter, '(net/url-decode "hello%20world")');
    assert.equal(decoded, 'hello world');
});

test('DI - Real-world scenario: config file reader', async () => {
    const platform = new MockPlatform();
    const sink = new CollectingOutputSink();

    // Setup mock files
    platform.setFile('/etc/app.conf', 'debug=true\nport=8080\n');
    platform.setEnv('APP_ENV', 'test');

    const interpreter = new CoreInterpreter({ platform, outputSink: sink });

    const result = await evaluate(interpreter, `
        (begin
            (def config (fs/read "/etc/app.conf"))
            (def env (sys/env "APP_ENV"))
            (say "Environment:" env)
            (say "Config:" config)
            (list env config))
    `);

    assert.deepEqual(result, ['test', 'debug=true\nport=8080\n']);
    assert.ok(sink.getStdout().some(line => line.includes('test')));
});

test('DI - Isolation: multiple interpreters with different mocks', async () => {
    // Interpreter 1 - production environment
    const prod = new MockPlatform();
    prod.setEnv('ENV', 'production');
    prod.setFile('/config.json', '{"mode": "prod"}');
    const interp1 = new CoreInterpreter({ platform: prod });

    // Interpreter 2 - test environment
    const test = new MockPlatform();
    test.setEnv('ENV', 'test');
    test.setFile('/config.json', '{"mode": "test"}');
    const interp2 = new CoreInterpreter({ platform: test });

    // Each interpreter sees its own environment
    const env1 = await evaluate(interp1, '(sys/env "ENV")');
    const env2 = await evaluate(interp2, '(sys/env "ENV")');

    assert.equal(env1, 'production');
    assert.equal(env2, 'test');

    const config1 = await evaluate(interp1, '(fs/read "/config.json")');
    const config2 = await evaluate(interp2, '(fs/read "/config.json")');

    assert.ok(config1.includes('prod'));
    assert.ok(config2.includes('test'));
});
