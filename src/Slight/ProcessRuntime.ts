import { AsyncQueue } from './AsyncQueue.js';
import { Slight } from '../Slight.js';
import { InputSource, SourceStream, OutputSink, OutputStream, OutputHandle } from './Types.js';

/**
 * Message structure for inter-process communication
 */
export interface Message {
    from: number;  // Sender PID
    data: any;     // Message payload
}

/**
 * Process handle tracking process state
 */
interface ProcessHandle {
    pid: number;
    mailbox: AsyncQueue<Message>;
    promise: Promise<void>;
    status: 'running' | 'completed' | 'error';
    error?: Error;
}

/**
 * Input source for spawned processes - yields the code once
 */
class CodeInputSource implements InputSource {
    constructor(private code: string) {}

    async *run(): SourceStream {
        yield this.code;
    }
}

/**
 * Output sink for spawned processes - discards output but logs errors
 */
class SilentOutputSink implements OutputSink {
    async run(source: OutputStream): Promise<void> {
        for await (const output of source) {
            // Log errors for debugging
            if (output.type === OutputHandle.ERROR || (output.value && typeof output.value === 'object' && output.value.type === 'ERROR')) {
                console.error('[Process Error]', output.value);
            }
            // Otherwise silently consume output
        }
    }
}

/**
 * Parent interpreter state that can be cloned into child processes
 */
export interface ParentState {
    functions: Map<string, any>;
    macros: Map<string, any>;
    bindings: Map<string, any>;
}

/**
 * Global process runtime managing all concurrent processes
 */
export class ProcessRuntime {
    private static instance: ProcessRuntime;
    private processes = new Map<number, ProcessHandle>();
    private nextPid = 1;

    private constructor() {}

    static getInstance(): ProcessRuntime {
        if (!ProcessRuntime.instance) {
            ProcessRuntime.instance = new ProcessRuntime();
        }
        return ProcessRuntime.instance;
    }

    /**
     * Spawn a new process running the given code
     * Returns the new process ID
     * Optionally accepts parent interpreter state to clone
     */
    spawn(code: string, parentState?: ParentState): number {
        const pid = this.nextPid++;
        const mailbox = new AsyncQueue<Message>();

        // Create a new Slight instance for this process
        const input = new CodeInputSource(code);
        const output = new SilentOutputSink();
        const slight = new Slight(input, output);

        // Clone parent state if provided (share-nothing concurrency)
        if (parentState) {
            slight.interpreter.functions = new Map(parentState.functions);
            slight.interpreter.macros = new Map(parentState.macros);
            slight.interpreter.bindings = new Map(parentState.bindings);
        }

        // Set the PID in the interpreter so builtins can access it
        (slight.interpreter as any)._processPid = pid;

        // Run the process in the background
        const promise = slight.run().then(
            () => {
                const handle = this.processes.get(pid);
                if (handle) {
                    handle.status = 'completed';
                }
            },
            (error: Error) => {
                const handle = this.processes.get(pid);
                if (handle) {
                    handle.status = 'error';
                    handle.error = error;
                }
            }
        );

        // Register the process
        const handle: ProcessHandle = {
            pid,
            mailbox,
            promise,
            status: 'running'
        };
        this.processes.set(pid, handle);

        return pid;
    }

    /**
     * Send a message from one process to another
     */
    send(fromPid: number, toPid: number, data: any): void {
        // Auto-register sender if needed (e.g., main process)
        if (!this.processes.has(fromPid)) {
            this.processes.set(fromPid, {
                pid: fromPid,
                mailbox: new AsyncQueue<Message>(),
                promise: Promise.resolve(),
                status: 'running'
            });
        }

        // Auto-register target if it's the main process (PID 0)
        let target = this.processes.get(toPid);
        if (!target && toPid === 0) {
            target = {
                pid: toPid,
                mailbox: new AsyncQueue<Message>(),
                promise: Promise.resolve(),
                status: 'running'
            };
            this.processes.set(toPid, target);
        }

        if (!target) {
            throw new Error(`Cannot send to process ${toPid}: process does not exist`);
        }
        if (target.status !== 'running') {
            throw new Error(`Cannot send to process ${toPid}: process has ${target.status}`);
        }

        const message: Message = { from: fromPid, data };
        target.mailbox.enqueue(message);
    }

    /**
     * Receive a message for the given process
     * Optionally with a timeout in milliseconds
     * Returns null if timeout expires
     */
    async recv(pid: number, timeout?: number): Promise<Message | null> {
        let handle = this.processes.get(pid);

        // Auto-register process if it doesn't exist (e.g., main process)
        if (!handle) {
            handle = {
                pid,
                mailbox: new AsyncQueue<Message>(),
                promise: Promise.resolve(),
                status: 'running'
            };
            this.processes.set(pid, handle);
        }

        if (timeout === undefined) {
            // No timeout, wait indefinitely
            return handle.mailbox.dequeue();
        } else {
            // With timeout
            const timeoutPromise = new Promise<null>((resolve) => {
                setTimeout(() => resolve(null), timeout);
            });

            return Promise.race([
                handle.mailbox.dequeue(),
                timeoutPromise
            ]);
        }
    }

    /**
     * Get the current process PID from an interpreter
     */
    getCurrentPid(interpreter: any): number {
        const pid = interpreter._processPid;
        if (pid === undefined) {
            // Main process (not spawned)
            return 0;
        }
        return pid;
    }

    /**
     * Check if a process exists
     */
    exists(pid: number): boolean {
        return this.processes.has(pid);
    }

    /**
     * Check if a process is alive (running)
     */
    isAlive(pid: number): boolean {
        const handle = this.processes.get(pid);
        return handle !== undefined && handle.status === 'running';
    }

    /**
     * Get list of all process PIDs
     */
    getProcesses(): number[] {
        return Array.from(this.processes.keys());
    }

    /**
     * Kill a process
     */
    kill(pid: number): boolean {
        const handle = this.processes.get(pid);
        if (!handle) {
            return false;
        }
        if (handle.status === 'running') {
            handle.status = 'completed';
            // Note: We can't actually stop the process from running,
            // but we mark it as completed so recv/send will fail
            return true;
        }
        return false;
    }

    /**
     * Wait for a process to complete
     */
    async wait(pid: number): Promise<void> {
        const handle = this.processes.get(pid);
        if (!handle) {
            throw new Error(`Cannot wait for process ${pid}: process does not exist`);
        }
        await handle.promise;
    }

    /**
     * Clean up completed processes
     */
    cleanup(): void {
        for (const [pid, handle] of this.processes.entries()) {
            if (handle.status !== 'running') {
                this.processes.delete(pid);
            }
        }
    }

    /**
     * Reset the runtime (for testing)
     * Clears all processes and resets PID counter
     */
    reset(): void {
        this.processes.clear();
        this.nextPid = 1;
    }
}
