
import { Dumper } from '../src/Slight/Logger'
import { parse, compile, run } from '../src/Slight';


let program = compile(parse(`

`));

let results = run(program);

Dumper.log(results);




