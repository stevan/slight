
import { Dumper } from '../src/Slight/Logger'
import { parse, compile, run } from '../src/Slight';


let program = compile(parse(`
    (and (not (! (not false))) (or (! true) 30))
`));

let results = run(program);

Dumper.log(results);




