
(def *count* 0)
(def *fails* 0)

(def diag (msg)
    (say (string/concat "# " msg)))

(def todo (msg)
    (diag (string/concat "TODO:" msg)))

(def pass (msg)
    (begin
        (say (string/join (list "ok" *count* msg) " "))
        (set! *count* (+ *count* 1))))

(def fail (msg)
    (begin
        (say (string/join (list "not ok" *count* msg) " "))
        (set! *count* (+ *count* 1))
        (set! *fails* (+ *fails* 1))))

(def ok (test msg)
    (cond
        (test (pass msg))
        (else (fail msg))))

(def is (got expected msg)
    (begin
    (ok (== got expected) msg)
    (cond ((!= got expected)
    (begin
         (diag (string/concat "Failed test " msg))
         (diag (string/concat "       got: " got))
         (diag (string/concat "  expected: " expected)))))))

(def done ()
    (begin
    (say (string/concat "1.." *count*))
    (cond ((> *fails* 0)
         (diag (string/concat "looks like you failed " *fails* " test(s) of " *count*))))))

