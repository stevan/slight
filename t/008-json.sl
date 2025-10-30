
(include "TestSimple.sl")

(diag "JSON namespace tests")

; json/stringify - basic types
(is (json/stringify 42) "42" "... stringify number")
(ok (string/includes? (json/stringify "hello") "hello") "... stringify string contains hello")
(is (json/stringify true) "true" "... stringify true")
(is (json/stringify false) "false" "... stringify false")
(is (json/stringify ()) "[]" "... stringify empty list")

; json/stringify - arrays
(is (json/stringify (list 1 2 3)) "[1,2,3]" "... stringify array")
(ok (string/includes? (json/stringify (list "a" "b" "c")) "a") "... stringify string array contains a")

; json/parse - basic types
(is (json/parse "42") 42 "... parse number")
(is (json/parse "\"hello\"") "hello" "... parse string")
(is (json/parse "true") true "... parse true")
(is (json/parse "false") false "... parse false")

; json/parse - arrays
(def arr (json/parse "[1,2,3]"))
(is (list/length arr) 3 "... parse array length")
(is (list/head arr) 1 "... parse array first element")
(is (list/nth arr 2) 3 "... parse array third element")

; Round-trip test
(def original (list 1 2 3 4 5))
(def json-str (json/stringify original))
(def parsed (json/parse json-str))
(is (list/length parsed) 5 "... round-trip preserves length")
(is (list/head parsed) 1 "... round-trip preserves first element")
(is (list/nth parsed 4) 5 "... round-trip preserves last element")

; Nested arrays
(def nested (list (list 1 2) (list 3 4)))
(def nested-json (json/stringify nested))
(def nested-parsed (json/parse nested-json))
(is (list/length nested-parsed) 2 "... nested array outer length")
(is (list/length (list/head nested-parsed)) 2 "... nested array inner length")
(is (list/head (list/head nested-parsed)) 1 "... nested array value")

; Mixed type array
(def mixed (list 1 "two" true))
(def mixed-json (json/stringify mixed))
(def mixed-parsed (json/parse mixed-json))
(is (list/nth mixed-parsed 0) 1 "... mixed array number")
(is (list/nth mixed-parsed 1) "two" "... mixed array string")
(is (list/nth mixed-parsed 2) true "... mixed array boolean")

(done)
