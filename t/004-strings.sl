
(include "TestSimple.sl")

(diag "String namespace tests")

; string/concat
(is (string/concat "hello "  "world")     "hello world" "... concat two strings")
(is (string/concat "hello"  " "  "world") "hello world" "... concat three strings")
(is (string/concat "a" "b" "c" "d") "abcd" "... concat multiple strings")

; string/upper and string/lower
(is (string/lower "HELLO") "hello" "... lower case works")
(is (string/upper "hello") "HELLO" "... upper case works")
(is (string/upper "HeLLo") "HELLO" "... upper case mixed")
(is (string/lower "HeLLo") "hello" "... lower case mixed")

; string/length
(is (string/length "hello") 5 "... length is 5")
(is (string/length "") 0 "... length of empty string is 0")
(is (string/length "a") 1 "... length of single char is 1")

; string/repeat
(is (string/repeat "x" 10) "xxxxxxxxxx" "... repeat 10 times")
(is (string/repeat "ab" 3) "ababab" "... repeat multi-char")
(is (string/repeat "x" 0) "" "... repeat 0 times gives empty string")

; string/substring and string/slice
(is (string/substring "hello world" 0 5) "hello" "... substring from 0 to 5")
(is (string/substring "hello world" 6 11) "world" "... substring from 6 to 11")
(is (string/substring "hello" 1) "ello" "... substring from 1 to end")
(is (string/slice "hello world" 0 5) "hello" "... slice from 0 to 5")
(is (string/slice "hello world" -5) "world" "... slice last 5 chars")

; string/index-of and string/last-index-of
(is (string/index-of "hello world" "o") 4 "... index-of 'o' is 4")
(is (string/index-of "hello world" "world") 6 "... index-of 'world' is 6")
(is (string/index-of "hello world" "x") -1 "... index-of missing char is -1")
(is (string/last-index-of "hello world" "o") 7 "... last-index-of 'o' is 7")

; string/replace and string/replace-all
(is (string/replace "hello world" "world" "there") "hello there" "... replace works")
(is (string/replace "hello hello" "hello" "hi") "hi hello" "... replace only first")
(is (string/replace-all "hello hello" "hello" "hi") "hi hi" "... replace-all works")

; string/split and string/join
(is (list/length (string/split "a,b,c" ",")) 3 "... split produces 3 items")
(is (list/head (string/split "a,b,c" ",")) "a" "... split first item is 'a'")
(is (string/join (list "a" "b" "c") ",") "a,b,c" "... join with comma")
(is (string/join (list "hello" "world") " ") "hello world" "... join with space")

; string/trim, string/trim-start, string/trim-end
(is (string/trim "  hello  ") "hello" "... trim both sides")
(is (string/trim-start "  hello  ") "hello  " "... trim start only")
(is (string/trim-end "  hello  ") "  hello" "... trim end only")

; string/starts-with?, string/ends-with?, string/includes?
(ok (string/starts-with? "hello world" "hello") "... starts-with 'hello'")
(ok (not (string/starts-with? "hello world" "world")) "... doesn't start with 'world'")
(ok (string/ends-with? "hello world" "world") "... ends-with 'world'")
(ok (not (string/ends-with? "hello world" "hello")) "... doesn't end with 'hello'")
(ok (string/includes? "hello world" "lo wo") "... includes 'lo wo'")
(ok (not (string/includes? "hello world" "xyz")) "... doesn't include 'xyz'")

; string/char-at and string/char-code
(is (string/char-at "hello" 0) "h" "... char-at 0 is 'h'")
(is (string/char-at "hello" 4) "o" "... char-at 4 is 'o'")
(is (string/char-code "A" 0) 65 "... char-code of 'A' is 65")
(is (string/char-code "a" 0) 97 "... char-code of 'a' is 97")

; string/from-char-code
(is (string/from-char-code 72 101 108 108 111) "Hello" "... from-char-code 'Hello'")

; string/pad-start and string/pad-end
(is (string/pad-start "5" 3 "0") "005" "... pad-start with zeros")
(is (string/pad-end "5" 3 "0") "500" "... pad-end with zeros")

(done)
