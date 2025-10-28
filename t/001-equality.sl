
(include "TestSimple.sl")

(diag "Equality tests")

(ok true "... true is")

(ok  (== true  true ) "... true is true")
(ok  (== false false) "... false is false")
(ok  (!= true  false) "... true is not false")
(ok  (!= false true ) "... false is not true")

(ok  (== 1 1     )  "... one is one")
(ok  (!= 1 2     )  "... one is not two")
(ok  (== 1 1.0   )  "... one is one.0")
(ok  (== 1.0 1   )  "... one.0 is one")
(ok  (== 1.5 1.5 )  "... one.5 is one.5")
(ok  (!= 1.5 2.5 )  "... one.5 is not two.5")
(ok  (== 1 true  )  "... one is true")
(ok  (== 0 false )  "... zero is false")
(ok  (!= 2 true  )  "... two is not true")

(ok  (== "hello" "hello")     "... string is string")
(ok  (!= "hello" "goodbye")   "... string is not other string")

(done)
