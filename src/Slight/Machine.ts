
import { DEBUG } from './Util'

import * as C from './Terms'
import * as E from './Environment'
import * as K from './Kontinue'

export class Machine {
    public queue    : K.Kontinue[];
    public ticks    : number;

    constructor () {
        this.queue = [];
        this.ticks = 0;
    }

    run (kont : K.Kontinue[]) : K.HostKontinue {
        // load the continuation
        this.queue.push(...kont);
        // and run until host
        return this.runUntilHost();
    }

    // provides the starting continuation
    // for evaluating any expression
    evaluateTerm (expr : C.Term, env : E.Environment) : K.Kontinue {
        if (DEBUG) console.log('!!EVAL!!', expr?.pprint());
        switch (expr.kind) {
        case 'Unit'        :
        case 'Nil'         :
        case 'Num'         :
        case 'Str'         :
        case 'Bool'        :
        case 'Native'      :
        case 'FExpr'       :
        case 'Lambda'      :
        case 'Key'         :
        case 'Hash'        :
        case 'Environment' : return K.Return( expr, env );
        case 'Cons'        : return K.EvalCons( expr, env );
        case 'Sym'         :
            let value = env.lookup( expr );
            if (value == undefined) {
                return K.Throw( new C.Exception(`Cannot find ${expr.pprint()} in Environment`), env );
            }
            return K.Return( value, env );
        case 'Exception' :
            // XXX - not sure this should happen
            console.log("******************* EXCEPTION! ", expr.pprint());
            return K.Throw( expr, env );
        }
    }

    // returns a value to the previous
    // continuation in the stack
    returnValues (...values : C.Term[]) : void {
        let top = this.queue.at(-1)!;
        top.stack.push( ...values );
    }

    // the step function ... !!!
    runUntilHost () : K.HostKontinue {
        while (this.queue.length > 0) {
            this.ticks++;
            if (DEBUG) console.log('>TICK', '-'.repeat(80));
            if (DEBUG) console.group("CONT in ", this.ticks);
            if (DEBUG) console.log(this.queue.map((c) => K.pprint(c)));
            if (DEBUG) console.groupEnd();
            if (DEBUG) console.log('=TICK', '-'.repeat(80));
            let k = this.queue.pop() as K.Kontinue;
            if (DEBUG) console.log('K -> ', K.pprint(k));
            if (DEBUG) console.log('E -> ', k.env.pprint());
            switch (k.op) {
            // ---------------------------------------------------------------------
            // This is the end of HOST operation, an async exit point
            // ---------------------------------------------------------------------
            case 'HOST':
                return k;
            // ---------------------------------------------------------------------
            // Exception handling
            // ---------------------------------------------------------------------
            case 'THROW':
                if (DEBUG) console.log('>THROW', '-'.repeat(80));
                if (DEBUG) console.group("CONT in throw", k.exception.pprint());
                if (DEBUG) console.log(this.queue.map((c) => K.pprint(c)));
                if (DEBUG) console.groupEnd();

                while (this.queue.length > 0) {
                    let isCatch = this.queue.at(-1)!;
                    if (isCatch.op == 'CATCH') {
                        // when we find a catch, give it the exception
                        this.returnValues( k.exception );
                        break;
                    } else {
                        // unwind, and discard results
                        if (DEBUG) console.log("UNWInDING", this.queue.pop()!.op);
                    }
                }
                // if we ran out completely, then we
                // continue to a SYS::error ...
                if (this.queue.length == 0)
                    return K.Host( 'SYS::error', k.env, k.exception );
                // but if we still have a queue it means
                // that we have a CATCH to process ...
                if (DEBUG) console.log('... continuing to the catch');
                if (DEBUG) console.group("CONT before going to catch");
                if (DEBUG) console.log(this.queue.map((c) => K.pprint(c)));
                if (DEBUG) console.groupEnd();
                if (DEBUG) console.log('<THROW', '-'.repeat(80));
                break;
            case 'CATCH':
                if (DEBUG) console.log('>CATCH', '-'.repeat(80));
                let handler = k.handler;
                let results = k.stack.pop()!;
                if (results instanceof C.Exception) {
                    if (DEBUG) console.log("@@@@@@@@@ GOT EXCEPTION", results.pprint());
                    if (DEBUG) console.log("HANDLER", handler.pprint());

                    let catcher = K.ApplyApplicative( (handler as C.Applicative), k.env );
                    catcher.stack.push( results );
                    this.queue.push( catcher );
                } else {
                    this.queue.push( K.Return( results, k.env ) );
                }
                if (DEBUG) console.group("CONT after CATCH");
                if (DEBUG) console.log(this.queue.map((c) => K.pprint(c)));
                if (DEBUG) console.groupEnd();
                if (DEBUG) console.log('<CATCH', '-'.repeat(80));
                break;
            // ---------------------------------------------------------------------
            // This is for defining things in the environment
            // ---------------------------------------------------------------------
            case 'DEFINE':
                let body = k.stack.pop()!;
                k.env.define( k.name, body );
                // FIXME - this should return SOMETHING more useful?!
                this.returnValues( new C.Unit() );
                break;
            // ---------------------------------------------------------------------
            // This is a literal value to be returned to the
            // previous continuation in the stack
            // ---------------------------------------------------------------------
            case 'RETURN':
                this.returnValues( k.value );
                break;
            // =====================================================================
            // Conditonal
            // =====================================================================
            case 'IF/ELSE':
                let cond = k.stack.pop()!;
                if (!(cond instanceof C.Bool)) {
                    this.queue.push(
                        K.Throw( new C.Exception(`Expected Bool at top of stack, not ${cond.kind} ${cond.pprint()}`), k.env )
                    );
                    break;
                }

                if ((cond as C.Bool).value) {
                    this.queue.push(
                        (k.cond === k.ifTrue)
                            ? K.Return( cond, k.env )
                            : this.evaluateTerm( k.ifTrue, k.env )
                    );
                }
                else {
                    this.queue.push(
                        (k.cond === k.ifFalse)
                            ? K.Return( cond, k.env )
                            : this.evaluateTerm( k.ifFalse, k.env )
                    );
                }
                break;
            // =====================================================================
            // Eval
            // =====================================================================
            // Main entry point
            // ---------------------------------------------------------------------
            case 'EVAL/EXPR':
                this.queue.push( this.evaluateTerm( k.expr, k.env ) );
                break;
            // ---------------------------------------------------------------------
            // Eval the Top of Stack
            // ---------------------------------------------------------------------
            case 'EVAL/TOS':
                let toEval = k.stack.pop();
                if (toEval == undefined) {
                    this.queue.push( K.Throw( new C.Exception('Expected Term at TOS, got nothing'), k.env) );
                    break;
                }
                this.queue.push( this.evaluateTerm(toEval, k.env) );
                break;
            // ---------------------------------------------------------------------
            // Eval Lists
            // ---------------------------------------------------------------------
            case 'EVAL/CONS':
                let cons  = k.cons;
                let check = K.ApplyExpr( cons.rest, k.env );
                this.queue.push( check, this.evaluateTerm( cons.first, k.env ) );
                break;
            case 'EVAL/CONS/REST':
                let tail = k.rest;
                // FIXME - this error should not happen because
                // it is prevented by the conditional below,
                // and by the conditionals in APPLY/EXPR, there
                // has to be a cleaner way to do this, but it
                // works for now.
                if (tail instanceof C.Nil) {
                    this.queue.push( K.Throw( new C.Exception('Got Nil in EVAL/CONS/REST, should never happen!'), k.env) );
                    break;
                }

                if (!((tail as C.Cons).rest instanceof C.Nil)) {
                    this.queue.push( K.EvalConsRest( (tail as C.Cons).rest, k.env ) );
                }

                k.stack.splice(0).forEach((evaled) => this.returnValues( evaled ));
                this.queue.push( this.evaluateTerm( (tail as C.Cons).first, k.env ) );
                break;
            // ---------------------------------------------------------------------
            // Handle function calls
            // ---------------------------------------------------------------------
            case 'APPLY/EXPR':
                let call = k.stack.pop();
                if (call == undefined) {
                    this.queue.push( K.Throw( new C.Exception('Expected callable at TOS, got nothing'), k.env) );
                    break;
                }

                if (call instanceof C.Operative) {
                    // FIXME - this is gross
                    let args = k.args;
                    if (args instanceof C.Nil) {
                        args = new C.Cons([]);
                    }
                    this.queue.push( K.ApplyOperative( (call as C.FExpr), args, k.env ));
                }
                else if (call instanceof C.Applicative) {
                    this.queue.push( K.ApplyApplicative( (call as C.Applicative), k.env ) );
                    // FIXME - I think this is right place for this
                    // but see comment above in EVAL/CONS/REST
                    if (!(k.args instanceof C.Nil)) {
                        this.queue.push( K.EvalConsRest( k.args, k.env ) );
                    }
                }
                else {
                    this.queue.push(K.Throw(
                        new C.Exception(`Cannot APPLY/EXPR to non-Callable ${call.pprint()}`),
                        k.env
                    ));
                }
                break;
            // =====================================================================
            // APPLY
            // =====================================================================
            // Operatives, or FExprs
            // - the arguments are not evaluated
            // ---------------------------------------------------------------------
            case 'APPLY/OPERATIVE':
                try {
                    this.queue.push(...(k.call as C.FExpr).body( (k.args as C.Cons).toNativeArray(), k.env ));
                } catch (e) {
                    this.queue.push( K.Throw( new C.Exception( `FExpr Error :: ${(e as Error).stack}` ), k.env) );
                }
                break;
            // ---------------------------------------------------------------------
            // Applicatives, or Lambdas & Native Functions
            // - arguments are evaluated
            // ---------------------------------------------------------------------
            case 'APPLY/APPLICATIVE':
                switch (k.call.constructor) {
                case C.Native:
                    try {
                        this.queue.push( K.Return( (k.call as C.Native).body( k.stack, k.env ), k.env ));
                    } catch (e) {
                        this.queue.push( K.Throw( new C.Exception( `Native Error :: ${(e as Error).stack} ` ), k.env) );
                    }
                    break;
                case C.Lambda:
                    let lambda  = k.call as C.Lambda;
                    let local   = lambda.env;

                    let params  = lambda.params.toNativeArray();
                    let args    = k.stack;
                    if (DEBUG) console.log('LAMBDA PARAMS', params.map((a) => a.pprint()));
                    if (DEBUG) console.log('LAMBDA ARGS', args.map((a) => a.pprint()));
                    let localEnv = local.derive( params as C.Sym[], args );
                    if (DEBUG) console.log('LAMBDA ENV', localEnv.pprint());
                    this.queue.push( K.EvalExpr( lambda.body, localEnv ) );
                }
                break;
            // ---------------------------------------------------------------------
            // .. the end
            // ---------------------------------------------------------------------
            default:
                throw new Error(`Unknown Continuation op ${JSON.stringify(k)}`);
            }
            if (DEBUG) console.log('<TICK', '-'.repeat(80));
        }

        // should never happen
        throw new Error(`WTF, this should never happen, we should always return`);
    }
}
