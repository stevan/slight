
import { ROOT_ENV } from './Slight/Runtime'

import * as C from './Slight/Terms'
import * as E from './Slight/Environment'
import * as K from './Slight/Kontinue'

export * as Util   from './Slight/Util'
export { parse   } from './Slight/Parser';
export { compile } from './Slight/Compiler';

import { parse   } from './Slight/Parser';
import { compile } from './Slight/Compiler';

import {
    HostHandlerConfig,
    IOHandler,
    AgentHandler,
} from './Slight/Handlers'

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------

export class Machine {
    public env      : E.Environment;
    public queue    : K.Kontinue[];
    public ticks    : number;
    public handlers : HostHandlerConfig;

    constructor () {
        // start with a fresh one!
        this.env      = ROOT_ENV.capture();
        this.queue    = [ K.Host('SYS::exit', this.env) ];
        this.ticks    = 0;
        this.handlers = {
            "IO" : new IOHandler(this),
            "AI" : new AgentHandler(this),
        };
    }

    prepareProgram (program : C.Term[], env : E.Environment) : K.Kontinue[] {
        return program.map((expr) => K.EvalExpr(expr, env)).reverse()
    }

    async run (program : C.Term[]) : Promise<K.HostKontinue> {
        let result : K.HostKontinue = this.queue[0] as K.HostKontinue;
        try {
            // compile the program terms
            let compiled = this.prepareProgram( program, this.env );
            // load the program
            this.queue.push(...compiled);
            // process the queue
            while (this.queue.length > 0) {
                // until you hit HOST
                result = this.runUntilHost();
                if (result.action == 'SYS::exit' ) break;
                if (result.action == 'SYS::error') break;
                // if not an exit, ... handle the host action
                let resume = await this.handleHostAction(result);
                // and then resume processing
                this.queue.push(...resume);
            }
        } catch (e) {
            console.log("WHOOPS!!!!!");
            throw e;
        } finally {
            // close up stuff ...
            this.handlers.IO.shutdown();
            this.handlers.AI.shutdown();
        }
        return result;
    }

    handleHostAction (k : K.HostKontinue) : Promise<K.Kontinue[]> {
        switch (true) {
        case k.action.startsWith('IO::'):
            return this.handlers.IO.accept(k);
        case k.action.startsWith('AI::'):
            return this.handlers.AI.accept(k);
        default:
            throw new Error(`The Host ${k.action} is not supported`);
        }
    }

    // provides the starting continuation
    // for evaluating any expression
    evaluateTerm (expr : C.Term, env : E.Environment) : K.Kontinue {
        switch (expr.kind) {
        case 'Nil'       :
        case 'Num'       :
        case 'Str'       :
        case 'Bool'      :
        case 'Native'    :
        case 'FExpr'     :
        case 'Lambda'    :
        case 'Tag'       : return K.Return( expr, env );
        case 'Cons'      : return K.EvalCons( expr, env );
        case 'Sym'       :
            let value = env.lookup( expr );
            if (value instanceof C.Exception) return K.Throw( value, env );
            return K.Return( env.lookup( expr ), env );
        case 'Exception' : return K.Throw( expr, env );
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
            let k = this.queue.pop() as K.Kontinue;
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
                console.log('GOT ERROR', k.exception.toNativeStr());
                return K.Host( 'SYS::error', k.env, k.exception );
            // ---------------------------------------------------------------------
            // This is for defining things in the environment
            // ---------------------------------------------------------------------
            case 'DEFINE':
                let body = k.stack.pop()!;
                k.env.define( k.name, body );
                // FIXME - this should return SOMETHING?!
                //this.returnValues( k.env.toPairList() );
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
                        K.Throw( new C.Exception(`Expected Bool at top of stack, not ${cond.kind} ${cond.toNativeStr()}`), k.env )
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
                let check = K.ApplyExpr( cons.tail, k.env );
                this.queue.push( check, this.evaluateTerm( cons.head, k.env ) );
                break;
            case 'EVAL/CONS/TAIL':
                let tail = k.tail;
                // FIXME - this error should not happen because
                // it is prevented by the conditional below,
                // and by the conditionals in APPLY/EXPR, there
                // has to be a cleaner way to do this, but it
                // works for now.
                if (tail instanceof C.Nil) {
                    this.queue.push( K.Throw( new C.Exception('Got Nil in EVAL/CONS/TAIL, should never happen!'), k.env) );
                    break;
                }

                if (!((tail as C.Cons).tail instanceof C.Nil)) {
                    this.queue.push( K.EvalConsTail( (tail as C.Cons).tail, k.env ) );
                }

                k.stack.splice(0).forEach((evaled) => this.returnValues( evaled ));
                this.queue.push( this.evaluateTerm( (tail as C.Cons).head, k.env ) );
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
                    // but see comment above in EVAL/CONS/TAIL
                    if (!(k.args instanceof C.Nil)) {
                        this.queue.push( K.EvalConsTail( k.args, k.env ) );
                    }
                }
                else {
                    this.queue.push(K.Throw(
                        new C.Exception(`Cannot APPLY/EXPR to non-Callable ${call.toNativeStr()}`),
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
                this.queue.push(...(k.call as C.FExpr).body( (k.args as C.Cons).toNativeArray(), k.env ));
                break;
            // ---------------------------------------------------------------------
            // Applicatives, or Lambdas & Native Functions
            // - arguments are evaluated
            // ---------------------------------------------------------------------
            case 'APPLY/APPLICATIVE':
                switch (k.call.constructor) {
                case C.Native:
                    this.queue.push( K.Return( (k.call as C.Native).body( k.stack, k.env ), k.env ));
                    break;
                case C.Lambda:
                    let lambda  = k.call as C.Lambda;
                    let local   = lambda.env;

                    let params  = lambda.params.toNativeArray();
                    let args    = k.stack;
                    this.queue.push( K.EvalExpr( lambda.body, local.derive( params as C.Sym[], args ) ) );
                }
                break;
            // ---------------------------------------------------------------------
            // .. the end
            // ---------------------------------------------------------------------
            default:
                throw new Error(`Unknown Continuation op ${JSON.stringify(k)}`);
            }
        }

        // should never happen
        throw new Error(`WTF, this should never happen, we should always return`);
    }
}
