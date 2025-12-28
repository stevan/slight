
import type { Environment } from './Environment'
import type { Term, Sym, Pair, Cons, Operative, Applicative } from './Terms'

// continuation base ...

export abstract class Kontinue {
    public stack : Term[];
    public env   : Environment;

    constructor(env : Environment) {
        this.env   = env;
        this.stack = []
    }

    toString () : string {
        let envStr =  this.env.toNativeStr();
        if (this.stack.length == 0) return ` ${envStr}`;
        return ` ^(${this.stack.map((t) => t.toNativeStr()).join(';')}) ${envStr}`
    }
}

// -----------------------------------------------------------------------------
// Finish the Program

// NOTE: Currently unused
export class Halt extends Kontinue {
    override toString () : string {
        return `HALT!`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Finish the Expression

export class EndStatement extends Kontinue {
    override toString () : string {
        return `EndStatement`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Definition

export class Definition extends Kontinue {
    constructor(public name : Sym, env : Environment) { super(env) }
    override toString () : string {
        return `Definition[${this.name.toNativeStr()}]`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Return a Value

export class Return extends Kontinue {
    constructor(public value : Term, env : Environment) { super(env) }
    override toString () : string {
        return `Return[${this.value.toNativeStr()}]`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Construction

export class MakePair extends Kontinue {
    override toString () : string {
        return `MakePair`+super.toString()
    }
}

export class MakeCons extends Kontinue {
    override toString () : string {
        return `MakeCons`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Eval:
//     "What does this expression mean in this environment?"
// -----------------------------------------------------------------------------

export abstract class Eval extends Kontinue {}

// root eval

export class EvalExpr extends Eval {
    constructor(public expr : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalExpr[${this.expr.toNativeStr()}]`+super.toString()
    }
}

// eval pairs

export class EvalPair  extends Eval {
    constructor(public pair : Pair, env : Environment) { super(env) }
    override toString () : string {
        return `EvalPair[${this.pair.toNativeStr()}]`+super.toString()
    }
}

export class EvalPairSecond extends Eval {
    constructor(public second : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalPairSecond[${this.second.toNativeStr()}]`+super.toString()
    }
}

// eval lists

export class EvalCons  extends Eval {
    constructor(public cons : Cons, env : Environment) { super(env) }
    override toString () : string {
        return `EvalCons[${this.cons.toNativeStr()}]`+super.toString()
    }
}

export class EvalConsTail   extends Eval {
    constructor(public tail : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalConsTail[${this.tail.toNativeStr()}]`+super.toString()
    }
}

// call procedures

export class ApplyExpr extends Kontinue {
    constructor(public args  : Term, env : Environment) { super(env) }
    override toString () : string {
        return `ApplyExpr[${this.args.toNativeStr()}]`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Apply:
//     "What happens when I invoke this procedure with these arguments?"
// -----------------------------------------------------------------------------

export abstract class Apply extends Kontinue {}

// FExprs

export class ApplyOperative extends Apply {
    public call : Operative;
    public args : Term;

    constructor(call : Operative, args : Term, env : Environment) {
        super(env);
        this.call = call;
        this.args = args;
    }

    override toString () : string {
        return `ApplyOperative[${this.call.toNativeStr()} ${this.args.toNativeStr()}]`+super.toString()
    }
}

// Lambda and Native

export class ApplyApplicative extends Apply {
    constructor(public call : Applicative, env : Environment) { super(env) }

    override toString () : string {
        return `ApplyApplicative[${this.call.toNativeStr()}]`+super.toString()
    }
}
