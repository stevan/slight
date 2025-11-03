
(defvar *count* 0)
(defvar *fails* 0)

(defun diag (msg)
    (say (string/concat "# " msg)))

(defun todo (msg)
    (diag (string/concat "TODO:" msg)))

(defun pass (msg)
    (begin
        (say (string/join (list "ok" *count* msg) " "))
        (set! *count* (+ *count* 1))))

(defun fail (msg)
    (begin
        (say (string/join (list "not ok" *count* msg) " "))
        (set! *count* (+ *count* 1))
        (set! *fails* (+ *fails* 1))))

(defun ok (test msg)
    (cond
        (test (pass msg))
        (else (fail msg))))

(defun is (got expected msg)
    (begin
    (ok (== got expected) msg)
    (cond ((!= got expected)
    (begin
         (diag (string/concat "Failed test " msg))
         (diag (string/concat "       got: " got))
         (diag (string/concat "  expected: " expected)))))))

(defun done ()
    (begin
    (say (string/concat "1.." *count*))
    (cond ((> *fails* 0)
         (diag (string/concat "looks like you failed " *fails* " test(s) of " *count*))))))

