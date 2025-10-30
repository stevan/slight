
(include "TestSimple.sl")

(diag "Type namespace tests")

; type/of - basic types
(is (type/of 42) "NUMBER" "... type of number is NUMBER")
(is (type/of 3.14) "NUMBER" "... type of float is NUMBER")
(is (type/of "hello") "STRING" "... type of string is STRING")
(is (type/of true) "BOOLEAN" "... type of true is BOOLEAN")
(is (type/of false) "BOOLEAN" "... type of false is BOOLEAN")

; type/of - nil and empty list
(is (type/of ()) "NIL" "... type of () is NIL")
(is (type/of (list)) "NIL" "... type of empty list is NIL")

; type/of - non-empty list
(is (type/of (list 1 2 3)) "LIST" "... type of non-empty list is LIST")
(is (type/of (list "a" "b")) "LIST" "... type of string list is LIST")

; type/of - function
(def myfunc (x) (+ x 1))
(is (type/of myfunc) "FUNCTION" "... type of defined function is FUNCTION")

; type/of - closure
(def make-adder (n) (fun (x) (+ x n)))
(def add5 (make-adder 5))
(is (type/of add5) "FUNCTION" "... type of closure is FUNCTION")

; type/is? - testing types
(ok (type/is? 42 "NUMBER") "... 42 is a NUMBER")
(ok (type/is? "hello" "STRING") "... 'hello' is a STRING")
(ok (type/is? true "BOOLEAN") "... true is a BOOLEAN")
(ok (type/is? (list 1 2) "LIST") "... (1 2) is a LIST")
(ok (type/is? () "NIL") "... () is NIL")

; type/is? - negative tests
(ok (not (type/is? 42 "STRING")) "... 42 is not a STRING")
(ok (not (type/is? "hello" "NUMBER")) "... 'hello' is not a NUMBER")
(ok (not (type/is? (list 1) "NIL")) "... non-empty list is not NIL")

; type/assert - success cases
(is (type/assert 42 "NUMBER") 42 "... assert NUMBER returns value")
(is (type/assert "hi" "STRING") "hi" "... assert STRING returns value")
(is (type/assert true "BOOLEAN") true "... assert BOOLEAN returns value")

; type/assert - failure case (using try/catch)
(def result
  (try
    (begin
      (type/assert 42 "STRING")
      "should not reach here")
    (catch e "caught error")))
(is result "caught error" "... type/assert throws on mismatch")

; Type checking with expressions
(is (type/of (+ 1 2)) "NUMBER" "... type of expression result")
(is (type/of (string/concat "a" "b")) "STRING" "... type of string concat")
(is (type/of (list/map (fun (x) (* x 2)) (list 1 2 3))) "LIST" "... type of map result")

; Type checking in conditionals
(def check-type (val)
  (cond
    ((type/is? val "NUMBER") "it's a number")
    ((type/is? val "STRING") "it's a string")
    (else "it's something else")))

(is (check-type 42) "it's a number" "... conditional type check for number")
(is (check-type "hello") "it's a string" "... conditional type check for string")
(is (check-type true) "it's something else" "... conditional type check for other")

(done)
