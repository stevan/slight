
import type { Environment } from './Environment'
import type { Term, Sym, Pair, Cons, Operative, Applicative } from './Terms'

export type HostKontinue = { op : 'HOST',   stack : Term[], env : Environment, action : string };

export type Kontinue =
    | HostKontinue
    | { op : 'IF/ELSE', stack : Term[], env : Environment, cond : Term, ifTrue : Term, ifFalse : Term }
    | { op : 'DEFINE', stack : Term[], env : Environment, name  : Sym }
    | { op : 'RETURN', stack : Term[], env : Environment, value : Term }
    | { op : 'MAKE/PAIR', stack : Term[], env : Environment }
    | { op : 'EVAL/EXPR',      stack : Term[], env : Environment, expr : Term }
    | { op : 'EVAL/TOS',       stack : Term[], env : Environment }
    | { op : 'EVAL/PAIR',      stack : Term[], env : Environment, pair : Pair }
    | { op : 'EVAL/PAIR/SND',  stack : Term[], env : Environment, second : Term }
    | { op : 'EVAL/CONS',      stack : Term[], env : Environment, cons : Cons }
    | { op : 'EVAL/CONS/TAIL', stack : Term[], env : Environment, tail : Term }
    | { op : 'APPLY/EXPR',        stack : Term[], env : Environment, args : Term }
    | { op : 'APPLY/OPERATIVE',   stack : Term[], env : Environment, call : Operative, args : Term }
    | { op : 'APPLY/APPLICATIVE', stack : Term[], env : Environment, call : Applicative }

export function Host (action : string, env : Environment) : Kontinue {
    return { op : 'HOST', stack : [], env, action }
}

export function IfElse (cond : Term, ifTrue : Term, ifFalse : Term, env : Environment) : Kontinue {
    return { op : 'IF/ELSE', stack : [], env, cond, ifTrue, ifFalse }
}

export function Define (name  : Sym,  env : Environment) : Kontinue { return { op : 'DEFINE', stack : [], env, name } }
export function Return (value : Term, env : Environment) : Kontinue { return { op : 'RETURN', stack : [], env, value } }

export function MakePair (env : Environment) : Kontinue { return { op : 'MAKE/PAIR', stack : [], env } }

export function EvalExpr (expr : Term, env : Environment) : Kontinue {
    return { op : 'EVAL/EXPR', stack : [], env, expr }
}

export function EvalTOS (env : Environment) : Kontinue { return { op : 'EVAL/TOS', stack : [], env } }

export function EvalPair (pair : Pair, env : Environment) : Kontinue {
    return { op : 'EVAL/PAIR', stack : [], env, pair }
}

export function EvalPairSecond (second : Term, env : Environment) : Kontinue {
    return { op : 'EVAL/PAIR/SND', stack : [], env, second }
}

export function EvalCons (cons : Cons, env : Environment) : Kontinue {
    return { op : 'EVAL/CONS', stack : [], env, cons }
}

export function EvalConsTail (tail : Term, env : Environment) : Kontinue {
    return { op : 'EVAL/CONS/TAIL', stack : [], env, tail }
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
    case 'HOST'              : return `${k.op}[] ^(${k.stack.map((i) => i.toNativeStr()).join(';')}) action: ${k.action}`;
    case 'IF/ELSE'           : return `${k.op}[] ^(${k.stack.map((i) => i.toNativeStr()).join(';')}) then: ${k.ifTrue.toNativeStr()} else: ${k.ifFalse.toNativeStr()}`;
    case 'DEFINE'            : return `${k.op}[${k.name.toNativeStr()}] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'RETURN'            : return `${k.op}[${k.value.toNativeStr()}] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'MAKE/PAIR'         : return `${k.op}[] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'EVAL/EXPR'         : return `${k.op}[${k.expr.toNativeStr()}] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'EVAL/TOS'          : return `${k.op}[] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'EVAL/PAIR'         : return `${k.op}[${k.pair.toNativeStr()}] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'EVAL/PAIR/SND'     : return `${k.op}[${k.second.toNativeStr()}] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'EVAL/CONS'         : return `${k.op}[${k.cons.toNativeStr()}] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'EVAL/CONS/TAIL'    : return `${k.op}[${k.tail.toNativeStr()}] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'APPLY/EXPR'        : return `${k.op}[${k.args.toNativeStr()}] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'APPLY/OPERATIVE'   : return `${k.op}[${k.call.toNativeStr()}](${k.args.toNativeStr()}) ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    case 'APPLY/APPLICATIVE' : return `${k.op}[${k.call.toNativeStr()}] ^(${k.stack.map((i) => i.toNativeStr()).join(';')})`;
    default: throw new Error(`Did not recognize Kontinue ${k} type`);
    }
}
