
(include "TestSimple.sl")

(diag "List namespace tests")

; list/create
(is (list/length (list/create 1 2 3)) 3 "... create list with 3 elements")
(is (list/head (list/create 1 2 3)) 1 "... first element is 1")
(is (list/length (list/create)) 0 "... create empty list")

; list/head and list/tail
(def mylist (list 1 2 3 4 5))
(is (list/head mylist) 1 "... head of (1 2 3 4 5) is 1")
(is (list/length (list/tail mylist)) 4 "... tail has 4 elements")
(is (list/head (list/tail mylist)) 2 "... head of tail is 2")

; list/cons
(is (list/head (list/cons 0 mylist)) 0 "... cons adds to front")
(is (list/length (list/cons 0 mylist)) 6 "... cons increases length")

; list/empty?
(ok (list/empty? (list)) "... empty list is empty")
(ok (not (list/empty? mylist)) "... non-empty list is not empty")

; list/length
(is (list/length (list 1 2 3)) 3 "... length of (1 2 3) is 3")
(is (list/length (list)) 0 "... length of () is 0")

; list/nth
(is (list/nth mylist 0) 1 "... nth 0 is 1")
(is (list/nth mylist 2) 3 "... nth 2 is 3")
(is (list/nth mylist 4) 5 "... nth 4 is 5")

; list/append
(is (list/length (list/append (list 1 2) (list 3 4))) 4 "... append two lists")
(is (list/nth (list/append (list 1 2) (list 3 4)) 2) 3 "... appended element")
(is (list/length (list/append (list 1 2) (list 3 4) (list 5 6))) 6 "... append three lists")

; list/reverse
(is (list/head (list/reverse (list 1 2 3))) 3 "... reverse puts last first")
(is (list/nth (list/reverse (list 1 2 3)) 2) 1 "... reverse puts first last")

; list/take and list/drop
(is (list/length (list/take mylist 3)) 3 "... take 3 elements")
(is (list/head (list/take mylist 3)) 1 "... take preserves order")
(is (list/length (list/drop mylist 2)) 3 "... drop 2 elements leaves 3")
(is (list/head (list/drop mylist 2)) 3 "... drop 2 starts at 3rd element")

; list/includes?
(ok (list/includes? (list 1 2 3) 2) "... includes 2")
(ok (not (list/includes? (list 1 2 3) 5)) "... doesn't include 5")

; list/flatten
(def nested (list (list 1 2) (list 3 (list 4 5))))
(is (list/length (list/flatten nested)) 5 "... flatten nested list")
(is (list/head (list/flatten nested)) 1 "... flatten preserves order")

; list/map
(def doubled (list/map (fun (x) (* x 2)) (list 1 2 3)))
(is (list/head doubled) 2 "... map doubles first element")
(is (list/nth doubled 2) 6 "... map doubles third element")

; list/filter
(def evens (list/filter (fun (x) (== (% x 2) 0)) (list 1 2 3 4 5 6)))
(is (list/length evens) 3 "... filter finds 3 evens")
(is (list/head evens) 2 "... first even is 2")

; list/reduce
(def sum (list/reduce (fun (acc x) (+ acc x)) 0 (list 1 2 3 4 5)))
(is sum 15 "... reduce sums to 15")
(def product (list/reduce (fun (acc x) (* acc x)) 1 (list 2 3 4)))
(is product 24 "... reduce multiplies to 24")

(done)
