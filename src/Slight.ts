
import { ROOT_ENV } from './Slight/Runtime'

import * as C from './Slight/Terms'
import * as E from './Slight/Environment'
import * as K from './Slight/Kontinue'

export * as Util   from './Slight/Util'
export { parse   } from './Slight/Parser';
export { compile } from './Slight/Compiler';

import { parse   } from './Slight/Parser';
import { compile } from './Slight/Compiler';

// -----------------------------------------------------------------------------
// I/O
// -----------------------------------------------------------------------------

import { spawn } from "child_process";

import * as readline from 'node:readline';

const READLINE : readline.ReadLine = readline.createInterface({
    input  : process.stdin,
    output : process.stdout,
});

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------

export class Machine {
    public env   : E.Environment;
    public queue : K.Kontinue[];
    public ticks : number;

    constructor () {
        // start with a fresh one!
        this.env   = ROOT_ENV.capture();
        this.queue = [ K.Host('SYS::exit', this.env) ];
        this.ticks = 0;
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
                if (result.action == 'SYS::exit') break;
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
            READLINE.close();
        }
        return result;
    }

    handleHostAction (k : K.HostKontinue) : Promise<K.Kontinue[]> {
        switch (k.action) {
        case 'IO::print':
            return new Promise<K.Kontinue[]>((resolve) => {
                console.log("STDOUT: ", k.stack.map((t) => t.toNativeStr()));
                resolve([ K.Return( new C.Nil(), k.env ) ]);
            });
        case 'IO::readline':
            return new Promise<K.Kontinue[]>((resolve) => {
                READLINE.question('? ', (input : string) => {
                    // XXX - should I add SIGINT handling here?
                    resolve([ K.Return( new C.Str(input), k.env ) ]);
                });
            });
        case 'IO::repl':
            return new Promise<K.Kontinue[]>((resolve) => {
                let result = k.stack.pop();
                if (result == undefined) {
                    result = new C.Nil();
                } else {
                    console.log(` >> : ${result.toNativeStr()}`);
                }
                // XXX - probably should remove this handler
                // after I get the response from the REPL
                READLINE.on('SIGINT', () => { resolve([ K.Return( result, k.env ) ]) });
                READLINE.question('repl? ', (source : string) => {
                    resolve([
                        K.Host( 'IO::repl', k.env ),
                        ...this.prepareProgram( compile(parse(source)), k.env ),
                    ]);
                });
            });
        case 'AI::repl':
            return new Promise<K.Kontinue[]>((resolve) => {

                if (k.stack.length > 0) {
                    let result = k.stack.pop()!;
                    let prev   = k.stack.pop()!;
                    console.group('');
                    console.log('?? PREV', prev.toNativeStr());
                    console.log('?? RESULT', result.toNativeStr());
                    console.groupEnd();
                    k.args.push(prev, result);
                }

                let [ query, ...results ] = k.args;
                console.group(`--- AI::REPL turn(${results.length / 2}) ---\n`)
                console.log("QUERY: ", query.toNativeStr());
                console.log("ARGS:", results.map((r) => r.toNativeStr()))

                let prev_results = '';
                for (let i = 0; i < results.length; i += 2) {
                    let prev = results[i + 0];
                    let resp = results[i + 1];
                    prev_results += `  ? ${prev.toNativeStr()}\n  > ${resp.toNativeStr()}\n`;
                }

                k.env.define(
                    new C.Sym('resume'),
                    new C.Native('resume', (args, env) => args[0]!)
                );

                let prompt = `
You are an agent working in a Lisp REPL to answer a query.
Do not use any context outside of this REPL.

AVAILABLE OPERATIONS:
(+ n m) - add two numbers
(- n m) - subtract two numbers
(* n m) - mulitply two numbers
(/ n m) - divide two numbers
(% n m) - modulo two numbers
(lambda (x y) (...)) - create lambda functions
(defun (name x y) (...)) - define named functions

Generate the next REPL expression. You can:
- Call any available operation to explore or act
- Use (resume <value>) when the problem is solved

Respond with ONLY a single S-expression, nothing else.

HISTORY:
${prev_results}

QUERY:
${query.toNativeStr()}

?`;
                console.log("PROMPT: ", prompt);
                console.groupEnd();

                const claude = spawn("claude", ["-p", prompt]);
                claude.stdin.end();

                let output = "";
                claude.stdout.on("data", (data) => output += data);

                claude.on("close", () => {
                    let source   = output.trim();
                    console.log('>>>>> GOT SOURCE :', source);
                    let compiled = compile(parse(source));
                    let prepared = this.prepareProgram( compiled, k.env )
                    if (!source.startsWith('(resume')) {
                        k.stack.push(compiled[0]!);
                        prepared.unshift(k);
                    }
                    resolve(prepared);
                });
            });
        default:
            throw new Error(`The Host ${k.action} is not supported`);
        }
    }

    // provides the starting continuation
    // for evaluating any expression
    evaluateTerm (expr : C.Term, env : E.Environment) : K.Kontinue {
        switch (expr.kind) {
        case 'Nil'    :
        case 'Num'    :
        case 'Str'    :
        case 'Bool'   :
        case 'Native' :
        case 'FExpr'  :
        case 'Lambda' : return K.Return( expr, env );
        case 'Sym'    : return K.Return( env.lookup( expr ), env );
        case 'Pair'   : return K.EvalPair( expr, env );
        case 'Cons'   : return K.EvalCons( expr, env );
        default:
            throw new Error(`Unrecognized Expression ${expr.constructor.name}`);
        }
    }

    // returns a value to the previous
    // continuation in the stack
    returnValues (...values : C.Term[]) : void {
        if (this.queue.length == 0)
            throw new Error(`Cannot return value ${values.map((v) => v.toNativeStr()).join(', ')} without continuation`);
        let top = this.queue.at(-1) as K.Kontinue;
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
            // This is for defining things in the environment
            // ---------------------------------------------------------------------
            case 'DEFINE':
                let body = k.stack.pop();
                if (body == undefined) throw new Error(`Expected body for DEFINE`);
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
                let cond = k.stack.pop();
                if (cond == undefined) throw new Error(`STACK UNDERFLOW, expected bool condition`);
                if (!(cond instanceof C.Bool)) throw new Error(`Expected Bool at top of stack, not ${cond.toString()}`);
                if ((cond as C.Bool).value) {
                    this.queue.push(
                        (k.cond === k.ifTrue)
                            ? K.Return( cond, k.env )
                            : this.evaluateTerm( k.ifTrue, k.env )
                    );
                } else {
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
                if (toEval === undefined) throw new Error('EVAL/TOS: empty stack');
                this.queue.push( this.evaluateTerm(toEval, k.env) );
                break;
            // ---------------------------------------------------------------------
            // Eval Pairs
            // ---------------------------------------------------------------------
            case 'EVAL/PAIR':
                let pair  = k.pair;
                this.queue.push(
                    K.EvalPairSecond( pair.second, k.env ),
                    this.evaluateTerm( pair.first, k.env ),
                );
                break;
            case 'EVAL/PAIR/SND':
                let second = this.evaluateTerm( k.second, k.env );
                let efirst = k.stack.pop() as C.Term;
                let mkPair = K.MakePair( k.env );
                mkPair.stack.push(efirst);
                this.queue.push( mkPair, second );
                break;
            case 'MAKE/PAIR':
                let snd = k.stack.pop();
                let fst = k.stack.pop();
                if (fst == undefined) throw new Error('Expected fst on stack');
                if (snd == undefined) throw new Error('Expected snd on stack');
                this.queue.push( K.Return( new C.Pair( fst as C.Term, snd as C.Term ), k.env ) );
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
                if (tail instanceof C.Nil) throw new Error(`Tail is Nil!`);

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
                if (call == undefined) throw new Error('Expected call on stack');
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
                    throw new Error(`What to do with call -> ${call.toString()}??`);
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
