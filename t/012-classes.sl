
(include "TestSimple.sl")

(diag "Object-Oriented Programming tests")

; Test 1: Simple Counter class
(class Counter (count)
  (init (initial)
    (set! count initial))

  (method increment ()
    (begin
      (set! count (+ count 1))
      count))

  (method decrement ()
    (begin
      (set! count (- count 1))
      count))

  (method get-value ()
    count)

  (method reset ()
    (set! count 0)))

(def c (new Counter 10))
(is (c :get-value) 10 "... counter initialized to 10")
(is (c :increment) 11 "... increment returns 11")
(is (c :increment) 12 "... increment returns 12")
(is (c :decrement) 11 "... decrement returns 11")
(c :reset)
(is (c :get-value) 0 "... reset sets value to 0")

; Test 2: BankAccount class with conditionals
(class BankAccount (owner balance)
  (init (owner-name initial-balance)
    (begin
      (set! owner owner-name)
      (set! balance initial-balance)))

  (method deposit (amount)
    (begin
      (set! balance (+ balance amount))
      balance))

  (method withdraw (amount)
    (cond
      ((>= balance amount)
        (begin
          (set! balance (- balance amount))
          balance))
      (else
        -1)))

  (method get-balance ()
    balance)

  (method get-owner ()
    owner))

(def account (new BankAccount "Alice" 1000))
(is (account :get-owner) "Alice" "... account owner is Alice")
(is (account :get-balance) 1000 "... initial balance is 1000")
(is (account :deposit 500) 1500 "... deposit 500 returns 1500")
(is (account :withdraw 200) 1300 "... withdraw 200 returns 1300")
(is (account :withdraw 2000) -1 "... withdraw more than balance returns -1")
(is (account :get-balance) 1300 "... balance unchanged after failed withdrawal")

; Test 3: Multiple instances
(def c1 (new Counter 0))
(def c2 (new Counter 100))
(c1 :increment)
(c2 :increment)
(is (c1 :get-value) 1 "... counter 1 is 1")
(is (c2 :get-value) 101 "... counter 2 is 101")

; Test 4: Class without init
(class Point (x y)
  (method get-x ()
    x)

  (method get-y ()
    y)

  (method set-coords (new-x new-y)
    (begin
      (set! x new-x)
      (set! y new-y))))

(def p (new Point))
(p :set-coords 10 20)
(is (p :get-x) 10 "... point x is 10")
(is (p :get-y) 20 "... point y is 20")

; Test 5: Method returning computed value
(class Rectangle (width height)
  (init (w h)
    (begin
      (set! width w)
      (set! height h)))

  (method area ()
    (* width height))

  (method perimeter ()
    (* 2 (+ width height))))

(def rect (new Rectangle 5 3))
(is (rect :area) 15 "... rectangle area is 15")
(is (rect :perimeter) 16 "... rectangle perimeter is 16")

; Test 6: Stateful accumulator
(class Accumulator (total)
  (init ()
    (set! total 0))

  (method add (value)
    (begin
      (set! total (+ total value))
      total))

  (method get-total ()
    total))

(def acc (new Accumulator))
(acc :add 5)
(acc :add 10)
(acc :add 3)
(is (acc :get-total) 18 "... accumulator total is 18")

(done)
