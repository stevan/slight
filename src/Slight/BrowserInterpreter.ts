import { CoreInterpreter } from './CoreInterpreter.js';
import { BrowserPlatform } from './Dependencies/Platform.js';

/**
 * Browser-compatible interpreter without Node.js dependencies
 *
 * Uses BrowserPlatform which provides:
 * - Network operations (net/fetch, net/url-encode, net/url-decode)
 * - Timer operations (timer/timeout, timer/interval, timer/clear, timer/sleep)
 *
 * Does NOT provide:
 * - File system operations (fs/* namespace)
 * - System operations (sys/* namespace)
 * - Include functionality (requires file system)
 */
export class BrowserInterpreter extends CoreInterpreter {
    constructor() {
        // Use BrowserPlatform (no fs/sys operations)
        super({
            platform: new BrowserPlatform()
        });
    }
}