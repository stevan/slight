
import { ROOT_ENV } from './Slight/Runtime'

import { Machine } from './Slight/Machine'

import * as C from './Slight/Terms'
import * as E from './Slight/Environment'
import * as K from './Slight/Kontinue'

import {
    HostHandlerConfig,
    IOHandler,
    AgentHandler,
} from './Slight/Handlers'

export { parse   } from './Slight/Parser'
export { compile } from './Slight/Compiler'

// -----------------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------------

export class Slight {
    public rootEnv  : E.Environment;
    public machine  : Machine;
    public handlers : HostHandlerConfig;

    constructor () {
        this.rootEnv = ROOT_ENV.capture(); // start with a fresh one!
        this.machine = new Machine();
        this.handlers = {
            "IO" : new IOHandler(this.prepareProgram),
            "AI" : new AgentHandler(this.prepareProgram),
        };
    }

    prepareProgram (program : C.Term[], env : E.Environment) : K.Kontinue[] {
        return program.map((expr) => K.EvalExpr(expr, env)).reverse()
    }

    async run (program : C.Term[]) : Promise<K.HostKontinue> {
        let halt   = K.Host( 'SYS::exit', this.rootEnv );
        let result = halt;
        try {
            let running  = true;
            let kont     = [ halt, ...this.prepareProgram( program, this.rootEnv ) ];
            let kontinue = this.machine.run( kont );
            while (running) {
                switch (kontinue.action) {
                case 'SYS::exit':
                case 'SYS::error':
                    result  = kontinue;
                    running = false;
                    break;
                default:
                    let kont = await this.handleHostAction( kontinue );
                    kontinue = this.machine.run( kont );
                }
            }

        } catch (e) {
            console.log(`Error in Slight Runtime!`);
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
}
