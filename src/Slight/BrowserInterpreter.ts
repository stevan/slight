import { CoreInterpreter } from './CoreInterpreter.js';

/**
 * Browser-compatible interpreter without Node.js dependencies
 */
export class BrowserInterpreter extends CoreInterpreter {
    constructor() {
        super();
    }

    protected override initBuiltins(): void {
        // Call parent to get core builtins
        super.initBuiltins();

        // Add map, JSON, and process builtins
        this.addMapBuiltins();
        this.addJSONBuiltins();
        this.addProcessBuiltins(); // Processes work in browser too!

        // Note: Node.js specific operations not included:
        // - File operations (read-file, write-file!, file-exists?, delete-file!, resolve-path)
        // - System operations (get-env, exit)
        // - Include functionality (requires file system access)
    }
}