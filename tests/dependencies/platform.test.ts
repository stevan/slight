import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockPlatform, NodePlatform } from '../../src/Slight/Dependencies/Platform.js';

test('MockPlatform file operations - write and read', () => {
    const platform = new MockPlatform();

    platform.fs!.write('/test.txt', 'content');
    assert.equal(platform.fs!.read('/test.txt'), 'content');
});

test('MockPlatform file operations - exists', () => {
    const platform = new MockPlatform();

    assert.equal(platform.fs!.exists('/test.txt'), false);

    platform.fs!.write('/test.txt', 'content');
    assert.equal(platform.fs!.exists('/test.txt'), true);
});

test('MockPlatform file operations - delete', () => {
    const platform = new MockPlatform();

    platform.fs!.write('/test.txt', 'content');
    assert.equal(platform.fs!.exists('/test.txt'), true);

    platform.fs!.delete('/test.txt');
    assert.equal(platform.fs!.exists('/test.txt'), false);
});

test('MockPlatform file operations - append', () => {
    const platform = new MockPlatform();

    platform.fs!.write('/test.txt', 'hello');
    platform.fs!.append('/test.txt', ' world');

    assert.equal(platform.fs!.read('/test.txt'), 'hello world');
});

test('MockPlatform file operations - copy', () => {
    const platform = new MockPlatform();

    platform.fs!.write('/src.txt', 'source content');
    platform.fs!.copy('/src.txt', '/dest.txt');

    assert.equal(platform.fs!.read('/dest.txt'), 'source content');
    assert.equal(platform.fs!.exists('/src.txt'), true); // original still exists
});

test('MockPlatform file operations - move', () => {
    const platform = new MockPlatform();

    platform.fs!.write('/src.txt', 'source content');
    platform.fs!.move('/src.txt', '/dest.txt');

    assert.equal(platform.fs!.read('/dest.txt'), 'source content');
    assert.equal(platform.fs!.exists('/src.txt'), false); // original deleted
});

test('MockPlatform file operations - stat', () => {
    const platform = new MockPlatform();

    platform.fs!.write('/test.txt', 'content');
    const stats = platform.fs!.stat('/test.txt');

    assert.equal(stats.size, 7); // 'content'.length
    assert.equal(stats.isFile, true);
    assert.equal(stats.isDirectory, false);
});

test('MockPlatform file operations - read non-existent file throws', () => {
    const platform = new MockPlatform();

    assert.throws(
        () => platform.fs!.read('/missing.txt'),
        /ENOENT.*no such file/
    );
});

test('MockPlatform tracks fetch calls', async () => {
    const platform = new MockPlatform();

    await platform.net.fetch('https://example.com', { method: 'POST' });

    assert.equal(platform.fetchCalls.length, 1);
    assert.equal(platform.fetchCalls[0].url, 'https://example.com');
    assert.equal(platform.fetchCalls[0].options.method, 'POST');
});

test('MockPlatform fetch returns mock response', async () => {
    const platform = new MockPlatform();

    const response = await platform.net.fetch('https://api.example.com/data');

    assert.equal(response.status, 200);
    assert.equal(response.text, 'Mock response for https://api.example.com/data');

    const json = await response.json();
    assert.equal(json.mock, true);
    assert.equal(json.url, 'https://api.example.com/data');
});

test('MockPlatform env operations', () => {
    const platform = new MockPlatform();

    assert.equal(platform.sys!.env('MISSING'), null);

    platform.setEnv('TEST_VAR', 'test_value');
    assert.equal(platform.sys!.env('TEST_VAR'), 'test_value');
});

test('MockPlatform sys operations', () => {
    const platform = new MockPlatform();

    assert.equal(platform.sys!.platform(), 'mock');
    assert.equal(platform.sys!.cwd(), '/mock/cwd');
    assert.equal(platform.sys!.homedir(), '/mock/home');
    assert.equal(platform.sys!.tmpdir(), '/mock/tmp');

    platform.sys!.chdir('/new/dir');
    assert.equal(platform.sys!.cwd(), '/new/dir');
});

test('MockPlatform test helpers', () => {
    const platform = new MockPlatform();

    platform.setFile('/config.json', '{"key": "value"}');
    assert.equal(platform.getFile('/config.json'), '{"key": "value"}');

    platform.clearFiles();
    assert.equal(platform.getFile('/config.json'), undefined);
    assert.equal(platform.fs!.exists('/config.json'), false);
});

test('NodePlatform has required operations', () => {
    const platform = new NodePlatform();

    // Verify all required operations exist
    assert.ok(platform.fs);
    assert.ok(platform.sys);
    assert.ok(platform.net);
    assert.ok(platform.timer);

    // Verify fs operations are defined
    assert.equal(typeof platform.fs.read, 'function');
    assert.equal(typeof platform.fs.write, 'function');
    assert.equal(typeof platform.fs.exists, 'function');

    // Verify sys operations are defined
    assert.equal(typeof platform.sys.cwd, 'function');
    assert.equal(typeof platform.sys.env, 'function');

    // Verify net operations are defined
    assert.equal(typeof platform.net.fetch, 'function');
    assert.equal(typeof platform.net.urlEncode, 'function');

    // Verify timer operations are defined
    assert.equal(typeof platform.timer.setTimeout, 'function');
    assert.equal(typeof platform.timer.setInterval, 'function');
});

test('MockPlatform URL encoding/decoding', () => {
    const platform = new MockPlatform();

    const encoded = platform.net.urlEncode('hello world');
    assert.equal(encoded, 'hello%20world');

    const decoded = platform.net.urlDecode(encoded);
    assert.equal(decoded, 'hello world');
});
