<!----------------------------------------------------------------------------->
# Plans
<!----------------------------------------------------------------------------->

## Parser

- the parser should produce a tree of Compound objects
    - these are basically just arrays of Token objects
        - each one representing a () in the language
        
- Token objects should contain source information
    - a reference to the source itself
    - line number, column number
    - the substring corresponding to this token
    
## Compiler

- takes the ParseTree of Compund objects and turns it into a Term tree
    - this is where the Weaver could be added
    - and macro support as well
    

## Slight

- move the load() code into the Compiler
    - have it handle building the initial continuation queue
    - then it can be called inside a FExpr and the resulting queue returned
    
- the handleHostAction() method needs a lot of work. 
    - it should be a Map lookup, not a switch statement
        - these are pluggable handlers


- READLINE needs to be handled better
    - do this when I clean up the Host action handlers. 




























<!----------------------------------------------------------------------------->
