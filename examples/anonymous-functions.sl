((fun (x y) (+ x y)) 10 20)

(def double (fun (x) (* x 2)))
(double 21)

(def apply (f x) (f x))
(apply (fun (n) (* n 3)) 14)

(def make-adder (x)
  (fun (y) (+ x y)))

(def add5 (make-adder 5))
(def add10 (make-adder 10))

(list (add5 3) (add10 3))

(def curry (fun (x)
  (fun (y)
    (fun (z) (+ x (+ y z))))))

(def step1 (curry 1))
(def step2 (step1 2))
(step2 3)

(def map (f lst)
  (cond
    ((empty? lst) (list))
    (else (cons (f (head lst)) (map f (tail lst))))))

(map (fun (x) (* x x)) (list 1 2 3 4 5))

(def filter (pred lst)
  (cond
    ((empty? lst) (list))
    ((pred (head lst)) (cons (head lst) (filter pred (tail lst))))
    (else (filter pred (tail lst)))))

(filter (fun (x) (> x 3)) (list 1 2 3 4 5 6))

(def compose (f g)
  (fun (x) (f (g x))))

(def add1 (fun (x) (+ x 1)))
(def times2 (fun (x) (* x 2)))
(def add1-then-times2 (compose times2 add1))

(add1-then-times2 5)