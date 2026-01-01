
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

// -----------------------------------------------------------------------------
// helpers for builtins
// -----------------------------------------------------------------------------

import type { Environment } from './Environment'
import type { Term, NativeFunc } from './Terms'
import { Num, Str, Bool } from './Terms'

export const liftNumBinOp = (f : (n : number, m : number) => number) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Num)) throw new Error(`LHS must be a Num, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Num)) throw new Error(`RHS must be a Num, not ${rhs.constructor.name}`);
        return new Num( f(lhs.value, rhs.value) );
    }
}

export const liftStrBinOp = (f : (n : string, m : string) => string) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Str)) throw new Error(`LHS must be a Str, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Str)) throw new Error(`RHS must be a Str, not ${rhs.constructor.name}`);
        return new Str( f(lhs.value, rhs.value) );
    }
}

export const liftNumCompareOp = (f : (n : number, m : number) => boolean) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Num)) throw new Error(`LHS must be a Num, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Num)) throw new Error(`RHS must be a Num, not ${rhs.constructor.name}`);
        return new Bool( f(lhs.value, rhs.value) );
    }
}

export const liftStrCompareOp = (f : (n : string, m : string) => boolean) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Str)) throw new Error(`LHS must be a Str, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Str)) throw new Error(`RHS must be a Str, not ${rhs.constructor.name}`);
        return new Bool( f(lhs.value, rhs.value) );
    }
}
