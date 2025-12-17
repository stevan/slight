
// Old Recursive Evaluator

function evaluate (exprs : Term[], env : Environment) : Term[] {

    const evaluateExpr = (expr : Term, env : Environment) : Term => {
        console.log('='.repeat(80));
        console.log(`%ENV ${env.toNativeStr()}`);
        console.log(`EVAL ${expr.toNativeStr()}`);
        console.log('-'.repeat(80));
        switch (expr.constructor) {
        case Nil    :
        case Num    :
        case Str    :
        case Bool   :
        case Native :
        case FExpr  : return expr;
        case Sym    :
            console.group(`... lookup ${expr.toNativeStr()}`);
            let result = env.lookup( expr as Sym );
            console.groupEnd();
            console.log(`<<< got ${result.toNativeStr()}`);
            return result;
        case Lambda : return new Closure( expr as Lambda, env.derive() );
        case Pair   :
            console.group(`... evaluate Pair ${expr.toNativeStr()}`);
            let pair = new Pair(
                evaluateExpr( (expr as Pair).first,  env ),
                evaluateExpr( (expr as Pair).second, env ),
            );
            console.groupEnd();
            console.log(`<<< got ${pair.toNativeStr()}`);
            return pair;
        case Cons   :
            let call = evaluateExpr( (expr as Cons).head, env );
            let tail = (expr as Cons).tail;

            // -----------------------------------------------------------------
            // Operative
            // -----------------------------------------------------------------

            if (call instanceof FExpr) {
                let args = tail instanceof Nil ? [] : tail.toNativeArray();
                return (call as FExpr).body( args, env );
            }

            // -----------------------------------------------------------------
            // Applicative
            // -----------------------------------------------------------------

            console.group(`EVAL args ... ${tail.toNativeStr()}`);
            let args = tail instanceof Nil ? [] : (tail as Cons).mapItems<Term>((e) => evaluateExpr(e, env));
            console.groupEnd();

            //console.log("CALL", call);

            switch (call.constructor) {
            case Native  : return (call as Native).body(args, env);
            case Closure :
                let lambda = (call as Closure).lambda;
                let local  = (call as Closure).env.derive();
                for (let i = 0; i < args.length; i++) {
                    local.define( lambda.params.at(i) as Sym, args[i] );
                }
                return evaluateExpr( lambda.body, local );
            default:
                throw new Error(`Must be Native or Closure, not ${call.constructor.name}`);
            }

            // -----------------------------------------------------------------
        default:
            throw new Error(`Unrecognized Expression ${expr.constructor.name}`);
        }
    }

    let results = exprs.map((e) => evaluateExpr(e, env));

    return results;
}



let env = new Environment((query : Sym) : Term => {
    console.log(`query // ${query.toNativeStr()} isa builtin?`);
    switch (query.ident) {
    case '+'  : return new Native('+',    liftNumBinOp((n, m) => n + m));
    case '-'  : return new Native('-',    liftNumBinOp((n, m) => n - m));
    case '*'  : return new Native('*',    liftNumBinOp((n, m) => n * m));
    case '/'  : return new Native('/',    liftNumBinOp((n, m) => n / m));
    case '%'  : return new Native('%',    liftNumBinOp((n, m) => n % m));
    case '>=' : return new Native('>=',   liftNumCompareOp((n, m) => n >= m));
    case '>'  : return new Native('>',    liftNumCompareOp((n, m) => n >  m));
    case '<=' : return new Native('<=',   liftNumCompareOp((n, m) => n <= m));
    case '<'  : return new Native('<',    liftNumCompareOp((n, m) => n <  m));
    case '==' : return new Native('==',   liftNumCompareOp((n, m) => n == m));
    case '!=' : return new Native('!=',   liftNumCompareOp((n, m) => n != m));
    case '~'  : return new Native('~',    liftStrBinOp((n, m) => n + m));
    case 'ge' : return new Native('ge',   liftStrCompareOp((n, m) => n >= m));
    case 'gt' : return new Native('gt',   liftStrCompareOp((n, m) => n >  m));
    case 'le' : return new Native('le',   liftStrCompareOp((n, m) => n <= m));
    case 'lt' : return new Native('lt',   liftStrCompareOp((n, m) => n <  m));
    case 'eq' : return new Native('eq',   liftStrCompareOp((n, m) => n == m));
    case 'ne' : return new Native('ne',   liftStrCompareOp((n, m) => n != m));

    case 'list' :
        return new Native('list', (args, env) => new Cons(args));

    case 'def' :
        return new FExpr('def', (args, env) => {
            let [ name, value ] = args;
            let [ evaled ] = evaluate([ value ], env );
            env.define( name as Sym, evaled );
            return new Nil();
        });

    default:
        throw new Error(`Unable to find ${query.ident} in Scope`);
    }
});


let program = compile(
    parse(`
        (def add (lambda (x y) (+ x y)))

        (def adder
            (lambda (x)
                (lambda (y) (+ x y)) )
        )

        ((adder 10) 20)

    `)
);

console.log(program.map((e) => e.toNativeStr()).join("\n"));

let results = evaluate(program, env);
console.log(results);
console.log(results.map((e) => e.toNativeStr()).join("\n"));
