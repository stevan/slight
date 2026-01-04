
import * as readline from 'node:readline';
import { spawn } from "child_process";

import type { Machine } from './Machine'

import * as C from './Terms'
import * as E from './Environment'
import * as K from './Kontinue'

import { parse   } from './Parser';
import { compile } from './Compiler';

export type HostHandlerConfig = {
    [key: string]: HostActionHandler;
}

export interface HostActionHandler {
    accept : (k : K.HostKontinue) => Promise<K.Kontinue[]>;
    shutdown () : void;
}

type PrepareProgram = (program : C.Term[], env : E.Environment) => K.Kontinue[];

export class AgentHandler implements HostActionHandler {
    public prepareProgram : PrepareProgram;

    constructor (prepareProgram : PrepareProgram) {
        this.prepareProgram = prepareProgram;
    }

    constructPrompt (query : C.Term, results : C.Term[]) : string {
        let prev_results = '';
        for (let i = 0; i < results.length; i += 2) {
            let prev = results[i + 0];
            let resp = results[i + 1];
            prev_results += `  ? ${prev.pprint()}\n  > ${resp.pprint()}\n`;
        }
        return `
You are an agent working in a Lisp REPL to answer a query.
Do not use any context outside of this REPL.

You can explore the language by exploring the environment starting
by calling ($Env) to get the root builtin environment. Some other
important forms are:

    - ($Env) - the root builtin environment
    - (*Env) - the current environment
    - (^Env) - the current parent environment
    - (lambda (x y) ...) - lambda construction
    - (def name value) - defining variables in *Env
    - (defun (nane x y) ...) - defining functions in *Env
    - %(:key value :key value ...) - defining a hash

NOTES:
    - a :key is a symbol that always evalutes to itself
    - the env-* functions accept :key or (quote sym) as arguments

Generate the next REPL expression. You can:
- Call any available operation to explore or act
- Use (resume <value>) when the problem is solved

**Respond with ONLY a single S-expression, followed by a line break, nothing else.**

HISTORY:
${prev_results}

QUERY:
${query.toNativeStr()}

?`
    }

    accept (k : K.HostKontinue) : Promise<K.Kontinue[]> {
        switch (k.action) {
        case 'AI::repl':
            return new Promise<K.Kontinue[]>((resolve) => {
                if (k.stack.length > 0) {
                    let result = k.stack.pop()!;
                    let prev   = k.stack.pop()!;
                    console.group('');
                    console.log('?? PREV', prev.pprint());
                    console.log('?? RESULT', result.pprint());
                    console.groupEnd();
                    k.args.push(prev, result);
                }

                let [ query, ...results ] = k.args;
                console.group(`--- AI::REPL turn(${results.length / 2}) ---\n`)
                console.log("QUERY: ", query.pprint());
                console.log("ARGS:", results.map((r) => r.pprint()))

                k.env.define(
                    new C.Sym('resume'),
                    new C.Native('resume', (args, env) => args[0]!)
                );

                let prompt = this.constructPrompt( query, results );
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

    shutdown () : void {}

}

export class IOHandler implements HostActionHandler {
    public rl             : readline.ReadLine;
    public prepareProgram : PrepareProgram;

    constructor (prepareProgram : PrepareProgram) {
        this.prepareProgram = prepareProgram;
        this.rl = readline.createInterface({
            input  : process.stdin,
            output : process.stdout,
        });
    }

    accept (k : K.HostKontinue) : Promise<K.Kontinue[]> {
        switch (k.action) {
        case 'IO::print':
            return new Promise<K.Kontinue[]>((resolve) => {
                console.log("STDOUT: ", k.stack.map((t) => t.pprint()));
                resolve([ K.Return( new C.Unit(), k.env ) ]);
            });
        case 'IO::readline':
            return new Promise<K.Kontinue[]>((resolve) => {
                this.rl.question('? ', (input : string) => {
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
                    console.log(` >> : ${result.pprint()}`);
                }
                // XXX - probably should remove this handler
                // after I get the response from the REPL
                this.rl.on('SIGINT', () => { resolve([ K.Return( result, k.env ) ]) });
                this.rl.question('repl? ', (source : string) => {
                    resolve([
                        K.Host( 'IO::repl', k.env ),
                        ...this.prepareProgram( compile(parse(source)), k.env ),
                    ]);
                });
            });
        default:
            throw new Error(`The Host ${k.action} is not supported`);
        }
    }

    shutdown () : void {
        this.rl.close();
    }
}
