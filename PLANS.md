<!----------------------------------------------------------------------------->
# Plans
<!----------------------------------------------------------------------------->

## Parser

- ParseExpr should be a bunch of token objects, not strings

## Slight
    
- the handleHostAction() should be a Map lookup, not a switch statement
    - these are pluggable handlers

- READLINE needs to be handled better
    - do this when I clean up the Host action handlers. 

## Runtime

- the (readline $var) thing is gross
    - it's only because i don't handle nullary functions
        - so fix that

## Terms

- instead of a name with a FExpr or Native, make it a signature
    - so `+` becomes `+:(n m)` or something similar






















<!----------------------------------------------------------------------------->
