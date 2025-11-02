import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CollectingOutputSink, QueueOutputSink } from '../../src/Slight/Dependencies/OutputSink.js';
import { OutputHandle, OutputToken } from '../../src/Slight/Types.js';

test('CollectingOutputSink captures stdout', () => {
    const sink = new CollectingOutputSink();

    sink.write({ type: OutputHandle.STDOUT, value: 'Hello' });
    sink.write({ type: OutputHandle.STDOUT, value: 'World' });

    assert.deepEqual(sink.getStdout(), ['Hello', 'World']);
});

test('CollectingOutputSink separates stdout and stderr', () => {
    const sink = new CollectingOutputSink();

    sink.write({ type: OutputHandle.STDOUT, value: 'out' });
    sink.write({ type: OutputHandle.WARN, value: 'warn' });
    sink.write({ type: OutputHandle.ERROR, value: 'err' });

    assert.deepEqual(sink.getStdout(), ['out']);
    assert.deepEqual(sink.getStderr(), ['warn', 'err']);
});

test('CollectingOutputSink getAll returns all outputs', () => {
    const sink = new CollectingOutputSink();

    sink.write({ type: OutputHandle.STDOUT, value: 'one' });
    sink.write({ type: OutputHandle.WARN, value: 'two' });
    sink.write({ type: OutputHandle.ERROR, value: 'three' });

    assert.deepEqual(sink.getAll(), ['one', 'two', 'three']);
});

test('CollectingOutputSink clear resets outputs', () => {
    const sink = new CollectingOutputSink();

    sink.write({ type: OutputHandle.STDOUT, value: 'test' });
    assert.equal(sink.outputs.length, 1);

    sink.clear();
    assert.equal(sink.outputs.length, 0);
    assert.deepEqual(sink.getAll(), []);
});

test('QueueOutputSink writes to queue', () => {
    const queue: OutputToken[] = [];
    const sink = new QueueOutputSink(queue);

    sink.write({ type: OutputHandle.STDOUT, value: 'test1' });
    sink.write({ type: OutputHandle.WARN, value: 'test2' });

    assert.equal(queue.length, 2);
    assert.equal(queue[0].value, 'test1');
    assert.equal(queue[0].type, OutputHandle.STDOUT);
    assert.equal(queue[1].value, 'test2');
    assert.equal(queue[1].type, OutputHandle.WARN);
});
