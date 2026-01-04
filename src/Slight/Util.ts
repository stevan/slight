
// -----------------------------------------------------------------------------
// Debugging/Logging
// -----------------------------------------------------------------------------

import * as util from 'node:util';
import { Console } from 'console';

export const DEBUG      = process.env['DEBUG'] == "1" ? true : false
export const TERM_WIDTH = process.stdout.columns;
export const MAX_WIDTH  = TERM_WIDTH - 1

const INSPECT_OPTIONS = {
    depth       : 20,
    sorted      : true,
    breakLength : TERM_WIDTH,
    colors      : true,
}

export const Logger = new Console({
    stdout         : process.stdout,
    stderr         : process.stderr,
    inspectOptions : INSPECT_OPTIONS,
})

export const Dumper = new Console({
    stdout           : process.stdout,
    stderr           : process.stderr,
    inspectOptions   : {
        sorted       : true,
        compact      : false,
        breakLength  : TERM_WIDTH,
        depth        : TERM_WIDTH,
        colors       : true,
    },
    groupIndentation : 4,
});
