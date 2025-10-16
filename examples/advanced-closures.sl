(def separator () (list "-------------------"))

(separator)

(def make-bank-account (initial-balance)
  (let ((balance initial-balance))
    (list
      (fun () balance)
      (fun (amount)
        (let ((new-balance (+ balance amount)))
          new-balance))
      (fun (amount)
        (let ((new-balance (- balance amount)))
          new-balance)))))

(def account1 (make-bank-account 1000))
(def get-balance (head account1))
(def deposit (head (tail account1)))
(def withdraw (head (tail (tail account1))))

(list "Initial balance:" (get-balance))
(list "After deposit 500:" (deposit 500))
(list "After withdraw 200:" (withdraw 200))

(separator)

(def make-fibonacci ()
  (fun (n)
    (cond
      ((== n 0) 0)
      ((== n 1) 1)
      (else (+ ((make-fibonacci) (- n 1))
               ((make-fibonacci) (- n 2)))))))

(def fib (make-fibonacci))
(list "Fibonacci sequence:" (list (fib 0) (fib 1) (fib 2) (fib 3) (fib 4) (fib 5) (fib 6)))

(separator)

(def make-filter (predicate)
  (fun (lst)
    (cond
      ((empty? lst) (list))
      ((predicate (head lst))
        (cons (head lst) ((make-filter predicate) (tail lst))))
      (else ((make-filter predicate) (tail lst))))))

(def evens (make-filter (fun (x) (== (mod x 2) 0))))
(def greater-than-5 (make-filter (fun (x) (> x 5))))

(def numbers (list 1 2 3 4 5 6 7 8 9 10))
(list "Even numbers:" (evens numbers))
(list "Numbers > 5:" (greater-than-5 numbers))

(separator)

(def make-compose ()
  (fun (f)
    (fun (g)
      (fun (x) (f (g x))))))

(def compose (make-compose))
(def add10 (fun (x) (+ x 10)))
(def times3 (fun (x) (* x 3)))
(def square (fun (x) (* x x)))

(def complex-fn ((compose square) ((compose times3) add10)))

(list "Compose (square (times3 (add10 5))):" (complex-fn 5))

(separator)

(def make-memoized (f)
  (let ((cache (make-map)))
    (fun (x)
      (cond
        ((map-has? cache x)
          (list "cached:" (map-get cache x)))
        (else
          (let ((result (f x)))
            (let ((ignored (map-set! cache x result)))
              (list "computed:" result))))))))

(def expensive-computation (fun (n)
  (* n n n)))

(def memoized-cube (make-memoized expensive-computation))

(list (memoized-cube 5) (memoized-cube 10) (memoized-cube 5))

(separator)

(def Y (fun (f)
  ((fun (x) (f (fun (y) ((x x) y))))
   (fun (x) (f (fun (y) ((x x) y)))))))

(def factorial-gen (fun (f)
  (fun (n)
    (cond
      ((== n 0) 1)
      (else (* n (f (- n 1))))))))

(def factorial (Y factorial-gen))
(list "Y-combinator factorial of 5:" (factorial 5))

(separator)