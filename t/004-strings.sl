
(include "TestSimple.sl")

(is (string/concat "hello "  "world")     "hello world" "... got the expected string")
(is (string/concat "hello"  " "  "world") "hello world" "... got the expected string")

(is (string/lower "HELLO") "hello" "... lc worked")
(is (string/upper "hello") "HELLO" "... uc worked")

(is (string/length "hello") 5 "... length is 5")

(is (string/repeat "x" 10) "xxxxxxxxxx" "... repeat works")

(done)
