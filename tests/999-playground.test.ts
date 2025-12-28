
import { Dumper } from '../src/Slight/Logger'
import { parse, compile, run } from '../src/Slight';


let program = compile(parse(`
    (def (length list)
        (?: (nil? list)
            0
            (+ 1 (length (tail list)))))

    (length (tail (list 1 2 3 4 5 6)))
`));

let results = run(program);

Dumper.log(results);




