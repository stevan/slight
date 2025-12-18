
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

// -----------------------------------------------------------------------------
// Runtime
// -----------------------------------------------------------------------------

abstract class Term {
    abstract toNativeStr () : string;

    toStr () : Str { return new Str(this.toNativeStr()) }
}

// -----------------------------------------------------------------------------

export class Nil extends Term {
    override toNativeStr () : string { return '()' }
}

export class Bool extends Term {
    public value : boolean;

    constructor (value : boolean) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return this.value ? 'true' : 'false' }
}

export class Num  extends Term {
    public value : number;

    constructor (value : number) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return this.value.toString() }
}

export class Str  extends Term {
    public value : string;

    constructor (value : string) {
        super();
        this.value = value;
    }

    override toNativeStr () : string { return `"${this.value}"` }
}

export class Sym  extends Term {
    public ident : string;

    constructor (ident : string) {
        super();
        this.ident = ident;
    }

    override toNativeStr () : string { return this.ident }
}

// -----------------------------------------------------------------------------

export class Pair extends Term {
    public first  : Term;
    public second : Term;

    constructor (fst : Term, snd : Term) {
        super();
        this.first  = fst;
        this.second = snd;
    }

    override toNativeStr () : string {
        return `(${this.first.toNativeStr()} . ${this.second.toNativeStr()})`
    }
}

// -----------------------------------------------------------------------------

abstract class List<T extends Term> extends Term {
    public items  : T[];
    public offset : number;

    constructor (items : T[], offset : number = 0) {
        super();
        this.items  = items;
        this.offset = offset;
    }

    at (i : number) : T {
        if ((this.offset + i) > this.items.length) throw new Error('OVERFLOW!');
        return this.items[ this.offset + i ];
    }

    mapItems<U> (f : (i : T) => U) : U[] {
        let list = [];
        for (let i = 0; i < this.length; i++) {
            list.push( f( this.at(i) ) );
        }
        return list;
    }

    get length () : number { return this.items.length - this.offset }
    get head   () : T      { return this.items[this.offset] }

    abstract get tail () : Term;

    toNativeArray () : Term[] {
        let list = [];
        for (let i = 0; i < this.length; i++) {
            list.push( this.at(i) );
        }
        return list;
    }

    override toNativeStr () : string {
        return `(${ this.items.slice(this.offset, this.items.length).map((i) => i.toNativeStr()).join(' ') })`
    }
}

export class Cons extends List<Term> {
    get tail () : Cons | Nil {
        if (this.length == 1) return new Nil();
        return new Cons(this.items, this.offset + 1);
    }

    map (f : (i : Term) => Term) : Cons {
        return new Cons( this.mapItems<Term>(f) );
    }
}

export class PairList extends List<Pair> {
    get tail () : PairList | Nil {
        if (this.length == 1) return new Nil();
        return new PairList(this.items, this.offset + 1);
    }

    map (f : (i : Pair) => Pair) : PairList {
        return new PairList( this.mapItems<Pair>(f) );
    }
}

// -----------------------------------------------------------------------------

type NativeFunc  = (params : Term[], env : Environment) => Term;
type NativeFExpr = (params : Term[], env : Environment) => Kontinue[];

abstract class Applicative extends Term {}
abstract class Operative   extends Term {}

export class Lambda extends Applicative {
    public params : Cons;
    public body   : Term;
    public env    : Environment;

    constructor (params : Cons, body : Term, env : Environment) {
        super();
        this.params = params;
        this.body   = body;
        this.env    = env;
    }

    override toNativeStr () : string {
        return `(λ ${this.params.toNativeStr()} ${this.body.toNativeStr()} ${this.env.toNativeStr()})`
    }
}

export class Native extends Applicative {
    public name : string;
    public body : NativeFunc;

    constructor (name : string, body : NativeFunc) {
        super();
        this.name = name;
        this.body = body;
    }

    override toNativeStr () : string {
        return `n:(${this.name})`
    }
}

export class FExpr extends Operative {
    public name : string;
    public body : NativeFExpr;

    constructor (name : string, body : NativeFExpr) {
        super();
        this.name = name;
        this.body = body;
    }

    override toNativeStr () : string {
        return `f:(${this.name})`
    }
}

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

type ParseExpr = Term | ParseExpr[];

export function parse (source : string) : Term[] {
    const SPLITTER = /\(|\)|'|"(?:[^"\\]|\\.)*"|[^\s\(\)';]+/g;

    const tokenize = (src : string) : string[] => src.match(SPLITTER) ?? [];

    const parseTokens = (tokens : string[]) : [ ParseExpr, string[] ] => {
        let token = tokens[0];
        if (token == undefined) throw new Error('Undefined Token');
        let rest = tokens.slice(1);
        if (token == '(') return parseList( rest, [] );
        switch (true) {
        case token == 'true'        : return [ new Bool(true),         rest ];
        case token == 'false'       : return [ new Bool(false),        rest ];
        case !isNaN(Number(token))  : return [ new Num(Number(token)), rest ];
        case token.charAt(0) == '"' : return [ new Str(token.slice(1, token.length - 1)), rest ];
        default                     : return [ new Sym(token),         rest ];
        }
    }

    const parseList = (tokens : string[], acc : ParseExpr[]) : [ ParseExpr[], string[] ] => {
        if (tokens[0] === ')') return [ acc, tokens.slice(1) ];
        let [ expr, remaining ] = parseTokens( tokens );
        return parseList( remaining, [ ...acc, expr ] );
    }

    let exprs  = [];
    let tokens = tokenize( source );
    let rest   = tokens;
    while (rest.length > 0) {
        let [ expr, remaining ] = parseTokens( rest );
        exprs.push(expr as Term);
        rest = remaining;
    }
    return exprs;
}

// -----------------------------------------------------------------------------
// Compiler
// -----------------------------------------------------------------------------

export function compile (expr : Term[]) : Term[] {

    const compileExpression = (expr : ParseExpr) : Term => {
        if (!Array.isArray(expr)) return expr;

        if (expr.length == 0) return new Cons([]);

        let rest = expr.map((e) => compileExpression(e));

        // handle pairs and bindings
        if (rest.length == 3) {
            let [ fst, sym, snd ] = rest;
            if (sym instanceof Sym) {
                switch(sym.ident) {
                case ':' : return new Pair( fst, snd );
                default:
                    // let it fall through
                }
            }
        }

        // handle different list types ...
        if (rest.every((p) => p instanceof Pair)) {
            return new PairList( rest );
        }
        else {
            return new Cons( rest );
        }
    }

    return expr.map(compileExpression);
}

// -----------------------------------------------------------------------------
// Environment
// -----------------------------------------------------------------------------

type Scope = (n : Sym) => Term;

export class Environment extends Term {
    public scope : Scope;
    public view  : string;

    constructor (scope : Scope, view : string = '') {
        super();
        this.scope = scope;
        this.view  = view;
    }

    lookup (sym : Sym) : Term {
        return this.scope(sym);
    }

    define (name : Sym, value : Term) : void {
        let upper = this.scope;
        LOG(YELLOW, ` ~ define(${name.toNativeStr()}) => ${this.view || '~{}'}`);
        this.view += `${name.toNativeStr()} : ${value.toNativeStr()}, `;
        this.scope = (query : Sym) : Term => {
            LOG(YELLOW, ` ~ lookup // ${query.toNativeStr()} in scope(${name.toNativeStr()})`);
            if (query.ident == name.ident) return value;
            return upper(query);
        };
    }

    capture () : Environment {
        // XXX - consider passing in the lambda
        // and looking for free variables that
        // need capturing, not sure if it actually
        // matters, but we could do it.
        return new Environment( this.scope, this.view );
    }

    derive (params : Sym[], args : Term[]) : Environment {
        if (params.length != args.length) throw new Error(`Not Enough args!`);

        // TODO - don't define() it all, but
        // create a custom param/bind Scope
        // function similar to how builtins
        // are handled.

        let local = new Environment( this.scope, this.view );
        for (let i = 0; i < params.length; i++) {
            local.define( params[i] as Sym, args[i] as Term );
        }

        return local;
    }

    override toNativeStr () : string {
        return `~{${this.view}}`
    }
}

// helpers for builtins

const liftNumBinOp = (f : (n : number, m : number) => number) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Num)) throw new Error(`LHS must be a Num, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Num)) throw new Error(`RHS must be a Num, not ${rhs.constructor.name}`);
        return new Num( f(lhs.value, rhs.value) );
    }
}

const liftStrBinOp = (f : (n : string, m : string) => string) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Str)) throw new Error(`LHS must be a Str, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Str)) throw new Error(`RHS must be a Str, not ${rhs.constructor.name}`);
        return new Str( f(lhs.value, rhs.value) );
    }
}

const liftNumCompareOp = (f : (n : number, m : number) => boolean) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Num)) throw new Error(`LHS must be a Num, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Num)) throw new Error(`RHS must be a Num, not ${rhs.constructor.name}`);
        return new Bool( f(lhs.value, rhs.value) );
    }
}

const liftStrCompareOp = (f : (n : string, m : string) => boolean) : NativeFunc => {
    return (args : Term[], env : Environment) => {
        let [ lhs, rhs ] = args;
        if (!(lhs instanceof Str)) throw new Error(`LHS must be a Str, not ${lhs.constructor.name}`);
        if (!(rhs instanceof Str)) throw new Error(`RHS must be a Str, not ${rhs.constructor.name}`);
        return new Bool( f(lhs.value, rhs.value) );
    }
}

// -----------------------------------------------------------------------------
// Continuation Passing Machine
// -----------------------------------------------------------------------------

// continuation base ...

abstract class Kontinue {
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
class Halt extends Kontinue {
    override toString () : string {
        return `HALT!`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Finish the Expression

class EndStatement extends Kontinue {
    override toString () : string {
        return `EndStatement`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Definition

class Definition extends Kontinue {
    constructor(public name : Sym, env : Environment) { super(env) }
    override toString () : string {
        return `Definition[${this.name.toNativeStr()}]`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Return a Value

class Return extends Kontinue {
    constructor(public value : Term, env : Environment) { super(env) }
    override toString () : string {
        return `Return[${this.value.toNativeStr()}]`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Construction

class MakePair extends Kontinue {
    override toString () : string {
        return `MakePair`+super.toString()
    }
}

class MakeCons extends Kontinue {
    override toString () : string {
        return `MakeCons`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Eval:
//     "What does this expression mean in this environment?"
// -----------------------------------------------------------------------------

abstract class Eval extends Kontinue {}

// root eval

class EvalExpr extends Eval {
    constructor(public expr : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalExpr[${this.expr.toNativeStr()}]`+super.toString()
    }
}

// eval pairs

class EvalPair  extends Eval {
    constructor(public pair : Pair, env : Environment) { super(env) }
    override toString () : string {
        return `EvalPair[${this.pair.toNativeStr()}]`+super.toString()
    }
}

class EvalPairSecond extends Eval {
    constructor(public second : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalPairSecond[${this.second.toNativeStr()}]`+super.toString()
    }
}

// eval lists

class EvalCons  extends Eval {
    constructor(public cons : Cons, env : Environment) { super(env) }
    override toString () : string {
        return `EvalCons[${this.cons.toNativeStr()}]`+super.toString()
    }
}

class EvalConsTail   extends Eval {
    constructor(public tail : Term, env : Environment) { super(env) }
    override toString () : string {
        return `EvalConsTail[${this.tail.toNativeStr()}]`+super.toString()
    }
}

// call procedures

class ApplyExpr extends Kontinue {
    constructor(public args  : Term, env : Environment) { super(env) }
    override toString () : string {
        return `ApplyExpr[${this.args.toNativeStr()}]`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Apply:
//     "What happens when I invoke this procedure with these arguments?"
// -----------------------------------------------------------------------------

abstract class Apply extends Kontinue {}

// FExprs

class ApplyOperative extends Apply {
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

class ApplyApplicative extends Apply {
    constructor(public call : Applicative, env : Environment) { super(env) }

    override toString () : string {
        return `ApplyApplicative[${this.call.toNativeStr()}]`+super.toString()
    }
}

// -----------------------------------------------------------------------------
// Interpreter
// -----------------------------------------------------------------------------

// the base environment

export const ROOT_ENV = new Environment((query : Sym) : Term => {
    LOG(YELLOW, ` ~ lookup || ${query.toNativeStr()} in scope(_) `);
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

    case 'list' : return new Native('list', (args, env) => new Cons(args));


    // Special Forms ...

    case 'lambda' : return new FExpr('lambda', (args, env) => {
        let [ params, body ] = args;
        return [
            new Return(
                new Lambda( params as Cons, body, env.capture() ),
                env
            )
        ]
    });

    case 'def' : return new FExpr('define', (args, env) => {
        let [ name, body ] = args;
        //env.define( name as Sym, body );
        return [
            new Definition( name as Sym, env ),
            new EvalExpr( body, env ),
        ]
    });
    default:
        throw new Error(`Unable to find ${query.ident} in Scope`);
    }
});

// -----------------------------------------------------------------------------
// State is a WIP
// -----------------------------------------------------------------------------
//
// currently it is:
// - the stack of the final continuation
// - the current Environment
// - the continuation stack
// - the step number
// - the number of ticks run
//
// The step function returns this after each expression
// and run function just collects them in a list
// and returns it.
//
// Not ideal, but works for now as we can see
// everything that is going on.
// -----------------------------------------------------------------------------

export type State = [ Term[], Environment, Kontinue[], number, number ];

export function run (program : Term[]) : State[] {

    // provides the starting continuation
    // for evaluating any expression
    const evaluateTerm = (expr : Term, env : Environment) : Kontinue => {
        HEADER(BLUE, `EVAL`, '.');
        LOG(BLUE, `[ ${expr.toNativeStr()} ] + ENV ${env.toNativeStr()}`);
        switch (expr.constructor) {
        case Nil    :
        case Num    :
        case Str    :
        case Bool   :
        case Native :
        case FExpr  :
        case Lambda : return new Return(expr, env);
        case Sym    : return new Return(env.lookup( expr as Sym ), env);
        case Pair   : return new EvalPair( expr as Pair, env );
        case Cons   : return new EvalCons( expr as Cons, env );
        default:
            throw new Error(`Unrecognized Expression ${expr.constructor.name}`);
        }
    }

    // returns a value to the previous
    // continuation in the stack
    const returnValues = (kont : Kontinue[], ...values : Term[]) : void => {
        if (kont.length == 0)
            throw new Error(`Cannot return value ${values.map((v) => v.toNativeStr()).join(', ')} without continuation`);
        let top = (kont.at(-1) as Kontinue);
        top.stack.push( ...values );
    }

    // the step function ... !!!
    const step() = (stepEnv : Environment, kont : Kontinue[], stepNum : number = 0) : State => {

        HEADER(GREEN, `STEP[${stepNum}]`, '=');
        LOG(GREEN, `EVAL in ${stepEnv.toNativeStr()}`);
        if (kont.length == 0) {
            LOG(GREY, `KONT : ~`);
        }
        else {
            LOG(GREY, `KONT :\n `, kont.toReversed().map((k) => k.toString()).join("\n  "));
        }

        let tick = 0;

        HEADER(YELLOW, `Begin Statement`, '_');
        while (kont.length > 0) {
            tick++;
            let k = kont.pop() as Kontinue;
            HEADER(PURPLE, `TICK(${tick})`, '-');
            LOG(RED, `=> K : `, k.toString());
            switch (k.constructor) {
            // ---------------------------------------------------------------------
            // This is the end of a statement, main exit point
            // ---------------------------------------------------------------------
            case EndStatement:
                HEADER(YELLOW, `End Statement`, '_');
                return [ k.stack, (k as Kontinue).env, kont, stepNum, tick ];
            // ---------------------------------------------------------------------
            // This is for defining things in the environment
            // ---------------------------------------------------------------------
            case Definition:
                let body = k.stack.pop() as Term;
                (k as Kontinue).env.define( (k as Definition).name, body );
                break;
            // ---------------------------------------------------------------------
            // This is a literal value to be returned to the
            // previous continuation in the stack
            // ---------------------------------------------------------------------
            case Return:
                returnValues( kont, (k as Return).value );
                break;
            // =====================================================================
            // Eval
            // =====================================================================
            // Main entry point
            // ---------------------------------------------------------------------
            case EvalExpr:
                kont.push( evaluateTerm( (k as EvalExpr).expr, (k as Kontinue).env ) );
                break;
            // ---------------------------------------------------------------------
            // Eval Pairs
            // ---------------------------------------------------------------------
            case EvalPair:
                let pair  = (k as EvalPair).pair;
                kont.push(
                    new EvalPairSecond( pair.second, (k as Kontinue).env ),
                    evaluateTerm( pair.first, (k as Kontinue).env ),
                );
                break;
            case EvalPairSecond:
                let second = evaluateTerm( (k as EvalPairSecond).second, (k as Kontinue).env );
                let efirst = k.stack.pop() as Term;
                let mkPair = new MakePair( (k as Kontinue).env );
                mkPair.stack.push(efirst);
                kont.push( mkPair, second );
                break;
            case MakePair:
                let snd = k.stack.pop();
                let fst = k.stack.pop();
                if (fst == undefined) throw new Error('Expected fst on stack');
                if (snd == undefined) throw new Error('Expected snd on stack');
                kont.push( new Return( new Pair( fst as Term, snd as Term ), (k as Kontinue).env ) );
                break;
            // ---------------------------------------------------------------------
            // Eval Lists
            // ---------------------------------------------------------------------
            case EvalCons:
                let cons  = (k as EvalCons).cons;
                let check = new ApplyExpr( cons.tail, (k as Kontinue).env );
                kont.push( check, evaluateTerm( cons.head, (k as Kontinue).env ) );
                break;
            case EvalConsTail:
                let tail = (k as EvalConsTail).tail;
                if (tail instanceof Nil) throw new Error(`Tail is Nil!`);

                if (!((tail as Cons).tail instanceof Nil)) {
                    kont.push( new EvalConsTail( (tail as Cons).tail, (k as Kontinue).env ) );
                }

                let evaled = k.stack.pop();
                if (evaled != undefined) {
                    returnValues( kont, evaled );
                }

                kont.push( evaluateTerm( (tail as Cons).head, (k as Kontinue).env ) );
                break;
            // ---------------------------------------------------------------------
            // Handle function calls
            // ---------------------------------------------------------------------
            case ApplyExpr:
                let call = k.stack.pop();
                if (call == undefined) throw new Error('Expected call on stack');
                if (call instanceof Operative) {
                    kont.push(new ApplyOperative( (call as FExpr), (k as ApplyExpr).args, (k as Kontinue).env ));
                }
                else if (call instanceof Applicative) {
                    kont.push(
                        new ApplyApplicative( (call as Applicative), (k as Kontinue).env ),
                        new EvalConsTail( (k as ApplyExpr).args, (k as Kontinue).env )
                    );
                }
                else {
                    throw new Error(`What to do with call -> ${call.constructor.name}??`);
                }
                break;
            // =====================================================================
            // APPLY
            // =====================================================================
            // Operatives, or FExprs
            // - the arguments are not evaluated
            // ---------------------------------------------------------------------
            case ApplyOperative:
                kont.push(...((k as ApplyOperative).call as FExpr).body(
                    ((k as ApplyOperative).args as Cons).toNativeArray(),
                    (k as Kontinue).env
                ));
                break;
            // ---------------------------------------------------------------------
            // Applicatives, or Lambdas & Native Functions
            // - arguments are evaluated
            // ---------------------------------------------------------------------
            case ApplyApplicative:
                switch ((k as ApplyApplicative).call.constructor) {
                case Native:
                    kont.push(new Return(
                        ((k as ApplyApplicative).call as Native).body( k.stack, (k as Kontinue).env ),
                        (k as Kontinue).env
                    ));
                    break;
                case Lambda:
                    let lambda  = (k as ApplyApplicative).call as Lambda;
                    let local   = lambda.env;

                    let params  = lambda.params.toNativeArray();
                    let args    = k.stack;
                    kont.push( new EvalExpr( lambda.body, local.derive( params as Sym[], args ) ) );
                }
                break;
            // ---------------------------------------------------------------------
            // .. the end
            // ---------------------------------------------------------------------
            default:
                throw new Error(`Unknown Continuation op ${JSON.stringify(k)}`);
            }

            if (kont.length == 0) {
                LOG(GREY, `KONT : ~`);
            }
            else {
                LOG(GREY, `KONT :\n `, kont.toReversed().map((k) => k.toString()).join("\n  "));
            }
        }

        // should never happen
        return [ [], stepEnv, kont, stepNum, tick ];
    }

    // ... program
    HEADER(ORANGE, 'PROGRAM', ':');
    LOG(ORANGE, program.map((e) => e.toNativeStr()).join("\n"));
    FOOTER(ORANGE, ':');

    // and collect the results
    let results : State[] = [];
    // start with a fresh one!
    let env = ROOT_ENV.capture();

    // run the program
    let result = step(
        env,
        [ ...program.map((expr) => new EvalExpr(expr, env)), new Halt(env) ].reverse()
    );

    HEADER(ORANGE, `RESULT(s)`, '=');
    if (result != undefined) {
        let [ stack, env, kont, stepNum, tick ] = result;
        LOG(ORANGE, [
            `STEP[${stepNum.toString().padStart(3, '0')}]+TICK[${tick.toString().padStart(3, '0')}] =>`,
            `STACK : ${stack.map((t) => t.toNativeStr()).join(', ')};`,
            `ENV : ${env.toNativeStr()};`,
            `KONT : [${kont.map((k) => k.toString()).join(', ')}]`,
        ].join(' '));
    } else {
        throw new Error('Expected result from step, got undefined')
    }

    //program.forEach((expr, i) => {
    //    let state = step( expr, env, [ new EndStatement(env) ], i );
    //    results.push(state);
    //    // thread environment through
    //    env = state[1] as Environment;
    //});

    //HEADER(ORANGE, `RESULT(s)`, '=');
    //LOG(ORANGE, results.map((state) => {
    //    let [ stack, env, kont, stepNum, tick ] = state;
    //    return [
    //        `STEP[${stepNum.toString().padStart(3, '0')}]+TICK[${tick.toString().padStart(3, '0')}] =>`,
    //        `STACK : ${stack.map((t) => t.toNativeStr()).join(', ')};`,
    //        `ENV : ${env.toNativeStr()};`,
    //        `KONT : [${kont.map((k) => k.toString()).join(', ')}]`,
    //    ].join(' ')
    //}).join("\n"));
    FOOTER(ORANGE, '=');

    // return the results
    return results;
}

// -----------------------------------------------------------------------------


