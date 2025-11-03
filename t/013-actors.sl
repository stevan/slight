(include "TestSimple.sl")
(include "lib/Actor.sl")

(diag "Actor system tests")

; Test 1: Simple Counter actor
(defclass Counter (count)
  (INIT (initial)
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

(defvar c (actor/new-1 "Counter" 10))
(is (call-0 c "get-value") 10 "... actor counter initialized to 10")
(is (call-0 c "increment") 11 "... actor increment returns 11")
(is (call-0 c "increment") 12 "... actor increment returns 12")
(is (call-0 c "decrement") 11 "... actor decrement returns 11")
(call-0 c "reset")
(is (call-0 c "get-value") 0 "... actor reset sets value to 0")

; Test 2: Multiple independent actors
(defvar c1 (actor/new-1 "Counter" 0))
(defvar c2 (actor/new-1 "Counter" 100))
(call-0 c1 "increment")
(call-0 c2 "increment")
(is (call-0 c1 "get-value") 1 "... actor counter 1 is 1")
(is (call-0 c2 "get-value") 101 "... actor counter 2 is 101")

; Test 3: BankAccount actor with conditionals
(defclass BankAccount (owner balance)
  (INIT (owner-name initial-balance)
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

(defvar account (actor/new-2 "BankAccount" "Alice" 1000))
(is (call-0 account "get-owner") "Alice" "... actor account owner is Alice")
(is (call-0 account "get-balance") 1000 "... actor initial balance is 1000")
(is (call-1 account "deposit" 500) 1500 "... actor deposit 500 returns 1500")
(is (call-1 account "withdraw" 200) 1300 "... actor withdraw 200 returns 1300")
(is (call-1 account "withdraw" 2000) -1 "... actor withdraw more than balance returns -1")
(is (call-0 account "get-balance") 1300 "... actor balance unchanged after failed withdrawal")

; Test 4: Accumulator actor
(defclass Accumulator (total)
  (INIT ()
    (set! total 0))

  (method add (value)
    (begin
      (set! total (+ total value))
      total))

  (method get-total ()
    total))

(defvar acc (actor/new-0 "Accumulator"))
(call-1 acc "add" 5)
(call-1 acc "add" 10)
(call-1 acc "add" 3)
(is (call-0 acc "get-total") 18 "... actor accumulator total is 18")

; Cleanup: kill all actor processes
(process/kill c)
(process/kill c1)
(process/kill c2)
(process/kill account)
(process/kill acc)

(done)
