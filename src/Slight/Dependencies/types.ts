// src/Slight/Dependencies/types.ts

import { OutputToken, OutputHandle } from '../Types.js';
import { CoreInterpreter } from '../CoreInterpreter.js';
import { ASTNode } from '../AST.js';
import { ParentState, ProcessRuntime } from '../ProcessRuntime.js';

/**
 * Output sink - where print/say/warn go
 */
export interface OutputSink {
    write(token: OutputToken): void;
}

/**
 * Process runtime - manages actor-style processes
 */
export interface IProcessRuntime {
    spawn(interpreter: CoreInterpreter, target: any, state?: ParentState): Promise<number>;
    send(pid: number, message: any): void;
    recv(pid: number, timeout?: number): Promise<any>;
    isAlive(pid: number): boolean;
    kill(pid: number): void;
    self(): number;
}

/**
 * File system operations (Node.js only)
 */
export interface FileSystemOperations {
    read(path: string): string;
    write(path: string, content: string): void;
    append(path: string, content: string): void;
    exists(path: string): boolean;
    delete(path: string): void;
    resolve(path: string, base?: string): string;
    mkdir(dirpath: string, recursive?: boolean): void;
    readdir(dirpath: string): string[];
    stat(filepath: string): FileStats;
    copy(src: string, dest: string): void;
    move(src: string, dest: string): void;
}

export interface FileStats {
    size: number;
    isFile: boolean;
    isDirectory: boolean;
    mtime: string;
    ctime: string;
}

/**
 * System operations (Node.js only)
 */
export interface SystemOperations {
    env(name: string): string | null;
    exit(code: number): never;
    args(): string[];
    cwd(): string;
    chdir(dir: string): void;
    platform(): string;
    homedir(): string;
    tmpdir(): string;
}

/**
 * Network operations (cross-platform)
 */
export interface NetworkOperations {
    fetch(url: string, options?: any): Promise<{
        status: number;
        text: string;
        json: () => Promise<any>;
    }>;
    urlEncode(str: string): string;
    urlDecode(str: string): string;
}

/**
 * Timer operations (cross-platform)
 */
export interface TimerOperations {
    setTimeout(callback: () => void, ms: number): any;
    clearTimeout(id: any): void;
    setInterval(callback: () => void, ms: number): any;
    clearInterval(id: any): void;
}

/**
 * Platform operations - I/O, filesystem, system calls
 */
export interface PlatformOperations {
    // File system (optional - not all platforms have this)
    fs?: FileSystemOperations;

    // System operations (optional)
    sys?: SystemOperations;

    // Network operations (cross-platform)
    net: NetworkOperations;

    // Timer operations (cross-platform)
    timer: TimerOperations;
}

/**
 * Dependencies that can be injected into interpreter
 * Note: processRuntime uses concrete ProcessRuntime class since it's a singleton
 * with specific implementation details we rely on
 */
export interface InterpreterDependencies {
    outputSink?: OutputSink;
    processRuntime?: ProcessRuntime;
    platform?: PlatformOperations;
}
