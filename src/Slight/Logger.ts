
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

export const ESC    = '\u001B[';
export const RESET  = ESC + '0m';
export const GREEN  = ESC + '38;2;20;200;20;m';
export const RED    = ESC + '38;2;250;50;50;m';
export const ORANGE = ESC + '38;2;255;150;0;m';
export const YELLOW = ESC + '38;2;255;250;0;m';
export const BLUE   = ESC + '38;2;70;100;255;m';
export const PURPLE = ESC + '38;2;150;30;150;m';
export const GREY   = ESC + '38;2;150;150;200;m';

type ANSIColor = string

export const HEADER = (color : ANSIColor, label : string, character : string, width : number = MAX_WIDTH) : void =>
    Logger.log(`${color}${character.repeat(2)} ${label} ${character.repeat( width - (label.length + 4) )}${RESET}`);

export const FOOTER = (color : ANSIColor, character : string, width : number = MAX_WIDTH) : void =>
    Logger.log(color+character.repeat(width)+RESET);

export function LOG (color : ANSIColor, ...args : any[]) : void {
    if (DEBUG) return;
    Logger.log(...(args.map((a) => typeof a === 'string' ? (color+a+RESET) : util.inspect(a,INSPECT_OPTIONS))));
}
