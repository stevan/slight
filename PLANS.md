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
    

































<!----------------------------------------------------------------------------->
