
import type { Environment } from './Environment'
import type { Term, Sym, Cons, Operative, Applicative, Exception, Lambda } from './Terms'

export type HostKontinue = {
    op     : 'HOST',
    stack  : Term[],
    env    : Environment,
    action : string,
    args   : Term[],
};

export type ThrowKontinue = {
    op        : 'THROW',
    stack     : Term[],
    env       : Environment,
    exception : Exception
};

export type CatchKontinue = {
    op        : 'CATCH',
    stack     : Term[],
    env       : Environment,
    handler   : Lambda
};

export type Kontinue =
    | HostKontinue
    | ThrowKontinue
    | CatchKontinue
    | { op : 'IF/ELSE', stack : Term[], env : Environment, cond : Term, ifTrue : Term, ifFalse : Term }
    | { op : 'DEFINE', stack : Term[], env : Environment, name  : Sym }
    | { op : 'RETURN', stack : Term[], env : Environment, value : Term }
    | { op : 'EVAL/EXPR',      stack : Term[], env : Environment, expr : Term }
    | { op : 'EVAL/TOS',       stack : Term[], env : Environment }
    | { op : 'EVAL/CONS',      stack : Term[], env : Environment, cons : Cons }
    | { op : 'EVAL/CONS/REST', stack : Term[], env : Environment, rest : Term }
    | { op : 'APPLY/EXPR',        stack : Term[], env : Environment, args : Term }
    | { op : 'APPLY/OPERATIVE',   stack : Term[], env : Environment, call : Operative, args : Term }
    | { op : 'APPLY/APPLICATIVE', stack : Term[], env : Environment, call : Applicative }

export function Host (action : string, env : Environment, ...args : Term[]) : HostKontinue {
    return { op : 'HOST', stack : [], env, action, args }
}

export function Throw (exception : Exception, env : Environment) : ThrowKontinue {
    return { op : 'THROW', stack : [], env, exception }
}

export function Catch (handler : Lambda, env : Environment) : CatchKontinue {
    return { op : 'CATCH', stack : [], env, handler }
}

export function IfElse (cond : Term, ifTrue : Term, ifFalse : Term, env : Environment) : Kontinue {
    return { op : 'IF/ELSE', stack : [], env, cond, ifTrue, ifFalse }
}

export function Define (name  : Sym,  env : Environment) : Kontinue { return { op : 'DEFINE', stack : [], env, name } }
export function Return (value : Term, env : Environment) : Kontinue { return { op : 'RETURN', stack : [], env, value } }

export function EvalExpr (expr : Term, env : Environment) : Kontinue {
    return { op : 'EVAL/EXPR', stack : [], env, expr }
}

export function EvalTOS (env : Environment) : Kontinue { return { op : 'EVAL/TOS', stack : [], env } }

export function EvalCons (cons : Cons, env : Environment) : Kontinue {
    return { op : 'EVAL/CONS', stack : [], env, cons }
}

export function EvalConsRest (rest : Term, env : Environment) : Kontinue {
    return { op : 'EVAL/CONS/REST', stack : [], env, rest }
}

export function ApplyExpr (args : Term, env : Environment) : Kontinue {
    return { op : 'APPLY/EXPR', stack : [], env, args }
}

export function ApplyOperative (call : Operative, args : Term, env : Environment) : Kontinue {
    return { op : 'APPLY/OPERATIVE', stack : [], env, call, args }
}

export function ApplyApplicative (call : Applicative, env : Environment) : Kontinue {
    return { op : 'APPLY/APPLICATIVE', stack : [], env, call }
}

export function pprint (k : Kontinue) : string {
    switch (k.op) {
    case 'HOST'              : return `${k.op}[] ^(${k.stack.map((i) => i.pprint()).join(';')}) action: ${k.action}`;
    case 'IF/ELSE'           : return `${k.op}[] ^(${k.stack.map((i) => i.pprint()).join(';')}) then: ${k.ifTrue.pprint()} else: ${k.ifFalse.pprint()}`;
    case 'DEFINE'            : return `${k.op}[${k.name.pprint()}] ^(${k.stack.map((i) => i.pprint()).join(';')})`;
    case 'RETURN'            : return `${k.op}[${k.value.pprint()}] ^(${k.stack.map((i) => i.pprint()).join(';')})`;
    case 'EVAL/EXPR'         : return `${k.op}[${k.expr.pprint()}] ^(${k.stack.map((i) => i.pprint()).join(';')})`;
    case 'EVAL/TOS'          : return `${k.op}[] ^(${k.stack.map((i) => i.pprint()).join(';')})`;
    case 'EVAL/CONS'         : return `${k.op}[${k.cons.pprint()}] ^(${k.stack.map((i) => i.pprint()).join(';')})`;
    case 'EVAL/CONS/REST'    : return `${k.op}[${k.rest.pprint()}] ^(${k.stack.map((i) => i.pprint()).join(';')})`;
    case 'APPLY/EXPR'        : return `${k.op}[${k.args.pprint()}] ^(${k.stack.map((i) => i.pprint()).join(';')})`;
    case 'APPLY/OPERATIVE'   : return `${k.op}[${k.call.pprint()}](${k.args.pprint()}) ^(${k.stack.map((i) => i.pprint()).join(';')})`;
    case 'APPLY/APPLICATIVE' : return `${k.op}[${k.call.pprint()}] ^(${k.stack.map((i) => i.pprint()).join(';')})`;
    default: throw new Error(`Did not recognize Kontinue ${k} type`);
    }
}
