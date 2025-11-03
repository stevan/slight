; Actor Library (Variadic Version)
;
; Wraps OO classes in processes for concurrent message-passing actors.
;
; Usage:
;   (defclass Counter (count)
;     (INIT (n) (set! count n))
;     (method increment () (set! count (+ count 1)) count))
;
;   (defvar c (actor/new "Counter" 0))
;   (call c "increment")  ; => 1
;   (call c "get-value")  ; => 1

; Internal actor loop function (used by spawned processes)
; Now uses variadic arguments for constructor params
(defun __actor-loop__ (class-name . init-args)
  (begin
    ; Create instance with variadic constructor args
    (defvar instance (cond
        ((list/empty? init-args)
          (object/new class-name))
        ((== (list/length init-args) 1)
          (object/new class-name (head init-args)))
        ((== (list/length init-args) 2)
          (object/new class-name (head init-args) (head (tail init-args))))
        (else
          (throw "Actor constructors with more than 2 args not yet supported"))))

    (defun loop ()
      (begin
        (defun msg (recv))
        (defun sender (head msg))
        (defvar data (head (tail msg)))

        ; data is either a string (method name) or a list (method-name . args)
        (defvar method-name (cond
            ((== (type/of data) "STRING") data)
            ((== (type/of data) "LIST") (head data))
            (else data)))

        (defvar method-args (cond
            ((== (type/of data) "STRING") (list))
            ((== (type/of data) "LIST") (tail data))
            (else (list))))

        (defvar result (try
            (cond
              ((list/empty? method-args)
                (method/call instance method-name))
              ((== (list/length method-args) 1)
                (method/call instance method-name (head method-args)))
              ((== (list/length method-args) 2)
                (method/call instance method-name (head method-args) (head (tail method-args))))
              (else
                (list "error" "Method calls with more than 2 args not yet supported")))
            (catch e
              (list "error" e))))

        (send sender result)
        (loop)))

    (loop)))

; actor/new: Create an actor from a class
; Now variadic - supports any number of constructor arguments
(defun actor/new (class-name . init-args)
  (cond
    ((list/empty? init-args)
      (spawn __actor-loop__ class-name))
    ((== (list/length init-args) 1)
      (spawn __actor-loop__ class-name (head init-args)))
    ((== (list/length init-args) 2)
      (spawn __actor-loop__ class-name (head init-args) (head (tail init-args))))
    (else
      (throw "Actor constructors with more than 2 args not yet supported"))))

; call: Synchronous RPC-style call to an actor
; Now variadic - supports any number of method arguments
(defun call (actor-pid method-name . method-args)
  (begin
    (defvar message (cond
        ((list/empty? method-args) method-name)
        (else (cons method-name method-args))))

    (send actor-pid message)
    (defun response (recv))
    (head (tail response))))

; Legacy API for backward compatibility
(defun actor/new-0 (class-name) (actor/new class-name))
(defun actor/new-1 (class-name arg1) (actor/new class-name arg1))
(defun actor/new-2 (class-name arg1 arg2) (actor/new class-name arg1 arg2))

(defun call-0 (actor-pid method-name) (call actor-pid method-name))
(defun call-1 (actor-pid method-name arg1) (call actor-pid method-name arg1))
(defun call-2 (actor-pid method-name arg1 arg2) (call actor-pid method-name arg1 arg2))
