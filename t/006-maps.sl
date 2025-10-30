
(include "TestSimple.sl")

(diag "Map namespace tests")

; map/create
(def m (map/create))
(is (map/size m) 0 "... new map has size 0")

; map/set! and map/get
(map/set! m "name" "Alice")
(is (map/get m "name") "Alice" "... get returns set value")
(is (map/size m) 1 "... size is 1 after one insertion")

(map/set! m "age" 30)
(is (map/get m "age") 30 "... numeric value stored")
(is (map/size m) 2 "... size is 2 after two insertions")

; map/has?
(ok (map/has? m "name") "... map has 'name' key")
(ok (map/has? m "age") "... map has 'age' key")
(ok (not (map/has? m "city")) "... map doesn't have 'city' key")

; map/delete!
(map/delete! m "age")
(ok (not (map/has? m "age")) "... key deleted")
(is (map/size m) 1 "... size decreased after delete")

; map/keys, map/values, map/entries
(map/set! m "city" "NYC")
(map/set! m "country" "USA")

(def keys (map/keys m))
(is (list/length keys) 3 "... keys list has 3 elements")
(ok (list/includes? keys "name") "... keys include 'name'")
(ok (list/includes? keys "city") "... keys include 'city'")

(def values (map/values m))
(is (list/length values) 3 "... values list has 3 elements")
(ok (list/includes? values "Alice") "... values include 'Alice'")
(ok (list/includes? values "NYC") "... values include 'NYC'")

(def entries (map/entries m))
(is (list/length entries) 3 "... entries list has 3 elements")

; map/clear!
(map/clear! m)
(is (map/size m) 0 "... map cleared to size 0")
(ok (not (map/has? m "name")) "... cleared map doesn't have keys")

; map/merge
(def m1 (map/create))
(map/set! m1 "a" 1)
(map/set! m1 "b" 2)

(def m2 (map/create))
(map/set! m2 "b" 3)
(map/set! m2 "c" 4)

(def m3 (map/merge m1 m2))
(is (map/size m3) 3 "... merged map has 3 keys")
(is (map/get m3 "a") 1 "... key from first map")
(is (map/get m3 "b") 3 "... overlapping key takes second map value")
(is (map/get m3 "c") 4 "... key from second map")

; map/from-list
(def m4 (map/from-list (list (list "x" 10) (list "y" 20) (list "z" 30))))
(is (map/size m4) 3 "... from-list creates map with 3 entries")
(is (map/get m4 "x") 10 "... from-list first entry")
(is (map/get m4 "y") 20 "... from-list second entry")
(is (map/get m4 "z") 30 "... from-list third entry")

; Test map with numeric keys
(def numMap (map/create))
(map/set! numMap 1 "one")
(map/set! numMap 2 "two")
(is (map/get numMap 1) "one" "... numeric key works")
(is (map/get numMap 2) "two" "... another numeric key works")

(done)
