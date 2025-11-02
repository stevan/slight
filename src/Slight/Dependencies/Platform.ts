import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
    PlatformOperations,
    FileSystemOperations,
    SystemOperations,
    NetworkOperations,
    TimerOperations,
    FileStats
} from './types.js';

/**
 * Node.js platform (current behavior)
 */
export class NodePlatform implements PlatformOperations {
    fs: FileSystemOperations = {
        read: (filepath: string) => fs.readFileSync(filepath, 'utf8'),

        write: (filepath: string, content: string) => {
            fs.writeFileSync(filepath, content, 'utf8');
        },

        append: (filepath: string, content: string) => {
            fs.appendFileSync(filepath, content, 'utf8');
        },

        exists: (filepath: string) => fs.existsSync(filepath),

        delete: (filepath: string) => {
            fs.unlinkSync(filepath);
        },

        resolve: (filepath: string, base?: string) => {
            if (base) {
                return path.resolve(path.dirname(base), filepath);
            }
            return path.resolve(filepath);
        },

        mkdir: (dirpath: string, recursive: boolean = true) => {
            fs.mkdirSync(dirpath, { recursive });
        },

        readdir: (dirpath: string) => fs.readdirSync(dirpath),

        stat: (filepath: string): FileStats => {
            const stats = fs.statSync(filepath);
            return {
                size: stats.size,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                mtime: stats.mtime.toISOString(),
                ctime: stats.ctime.toISOString()
            };
        },

        copy: (src: string, dest: string) => {
            fs.copyFileSync(src, dest);
        },

        move: (src: string, dest: string) => {
            fs.renameSync(src, dest);
        }
    };

    sys: SystemOperations = {
        env: (name: string) => process.env[name] ?? null,
        exit: (code: number = 0): never => process.exit(code),
        args: () => process.argv.slice(2),
        cwd: () => process.cwd(),
        chdir: (dir: string) => process.chdir(dir),
        platform: () => process.platform,
        homedir: () => os.homedir(),
        tmpdir: () => os.tmpdir()
    };

    net: NetworkOperations = {
        fetch: async (url: string, options?: any) => {
            const response = await fetch(url, options);
            const text = await response.text();
            return {
                status: response.status,
                text: text,
                json: async () => JSON.parse(text)
            };
        },
        urlEncode: (str: string) => encodeURIComponent(str),
        urlDecode: (str: string) => decodeURIComponent(str)
    };

    timer: TimerOperations = {
        setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
        clearTimeout: (id: any) => clearTimeout(id),
        setInterval: (callback: () => void, ms: number) => setInterval(callback, ms),
        clearInterval: (id: any) => clearInterval(id)
    };
}

/**
 * Browser platform (no fs/sys)
 */
export class BrowserPlatform implements PlatformOperations {
    // fs and sys are undefined (not available in browser)

    net: NetworkOperations = {
        fetch: async (url: string, options?: any) => {
            const response = await fetch(url, options);
            const text = await response.text();
            return {
                status: response.status,
                text: text,
                json: async () => JSON.parse(text)
            };
        },
        urlEncode: (str: string) => encodeURIComponent(str),
        urlDecode: (str: string) => decodeURIComponent(str)
    };

    timer: TimerOperations = {
        setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
        clearTimeout: (id: any) => clearTimeout(id),
        setInterval: (callback: () => void, ms: number) => setInterval(callback, ms),
        clearInterval: (id: any) => clearInterval(id)
    };
}

/**
 * Mock platform (for testing)
 */
export class MockPlatform implements PlatformOperations {
    private files = new Map<string, string>();
    private envVars = new Map<string, string>();
    public fetchCalls: Array<{ url: string, options?: any }> = [];
    private _cwd = '/mock/cwd';

    fs: FileSystemOperations = {
        read: (filepath: string) => {
            if (!this.files.has(filepath)) {
                throw new Error(`ENOENT: no such file or directory, open '${filepath}'`);
            }
            return this.files.get(filepath)!;
        },

        write: (filepath: string, content: string) => {
            this.files.set(filepath, content);
        },

        append: (filepath: string, content: string) => {
            const existing = this.files.get(filepath) ?? '';
            this.files.set(filepath, existing + content);
        },

        exists: (filepath: string) => this.files.has(filepath),

        delete: (filepath: string) => {
            if (!this.files.has(filepath)) {
                throw new Error(`ENOENT: no such file or directory, unlink '${filepath}'`);
            }
            this.files.delete(filepath);
        },

        resolve: (filepath: string, base?: string) => {
            if (base) {
                return path.resolve(path.dirname(base), filepath);
            }
            return path.resolve(this._cwd, filepath);
        },

        mkdir: (dirpath: string, recursive: boolean = true) => {
            // Mock implementation - just record that directory exists
            this.files.set(dirpath + '/.dir', '');
        },

        readdir: (dirpath: string) => {
            const prefix = dirpath.endsWith('/') ? dirpath : dirpath + '/';
            return Array.from(this.files.keys())
                .filter(p => p.startsWith(prefix))
                .map(p => p.slice(prefix.length).split('/')[0])
                .filter((v, i, a) => a.indexOf(v) === i); // unique
        },

        stat: (filepath: string): FileStats => {
            if (!this.files.has(filepath)) {
                throw new Error(`ENOENT: no such file or directory, stat '${filepath}'`);
            }
            const content = this.files.get(filepath)!;
            return {
                size: content.length,
                isFile: !filepath.endsWith('/.dir'),
                isDirectory: filepath.endsWith('/.dir'),
                mtime: new Date().toISOString(),
                ctime: new Date().toISOString()
            };
        },

        copy: (src: string, dest: string) => {
            if (!this.files.has(src)) {
                throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
            }
            this.files.set(dest, this.files.get(src)!);
        },

        move: (src: string, dest: string) => {
            if (!this.files.has(src)) {
                throw new Error(`ENOENT: no such file or directory, rename '${src}'`);
            }
            this.files.set(dest, this.files.get(src)!);
            this.files.delete(src);
        }
    };

    sys: SystemOperations = {
        env: (name: string) => this.envVars.get(name) ?? null,
        exit: (code: number): never => {
            throw new Error(`MockExit: ${code}`);
        },
        args: () => ['mock-arg1', 'mock-arg2'],
        cwd: () => this._cwd,
        chdir: (dir: string) => {
            this._cwd = dir;
        },
        platform: () => 'mock',
        homedir: () => '/mock/home',
        tmpdir: () => '/mock/tmp'
    };

    net: NetworkOperations = {
        fetch: async (url: string, options?: any) => {
            this.fetchCalls.push({ url, options });
            return {
                status: 200,
                text: `Mock response for ${url}`,
                json: async () => ({ mock: true, url })
            };
        },
        urlEncode: (str: string) => encodeURIComponent(str),
        urlDecode: (str: string) => decodeURIComponent(str)
    };

    timer: TimerOperations = {
        setTimeout: (callback: () => void, ms: number) => {
            // Immediate execution for testing
            setImmediate(callback);
            return 123;
        },
        clearTimeout: () => {},
        setInterval: (callback: () => void, ms: number) => {
            setImmediate(callback);
            return 456;
        },
        clearInterval: () => {}
    };

    // Test helpers
    setFile(filepath: string, content: string): void {
        this.files.set(filepath, content);
    }

    getFile(filepath: string): string | undefined {
        return this.files.get(filepath);
    }

    setEnv(name: string, value: string): void {
        this.envVars.set(name, value);
    }

    clearFiles(): void {
        this.files.clear();
    }
}
