
(include "TestSimple.sl")

(diag "Comparison tests")

(ok (<  1    2 ) "... one is less than two")
(ok (<= 1    2 ) "... one is less than or equal two")
(ok (<= 1    1 ) "... one is less than or equal one")
(ok (>  10   2 ) "... ten is greater than two")
(ok (>= 10   2 ) "... ten is greater than or equal two")
(ok (>= 10   10) "... ten is greater than or equal ten")

(ok (<  "a" "b") "... a is less than b")
(ok (<= "a" "b") "... a is less than or equal b")
(ok (<= "a" "a") "... a is less than or equal a")
(ok (>  "b" "a") "... b is greater than a")
(ok (>= "b" "a") "... b is greater than  or equal a")
(ok (>= "b" "b") "... b is greater than  or equal b")

(done)
