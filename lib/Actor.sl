; Actor Library
;
; Wraps OO classes in processes for concurrent message-passing actors.
;
; Usage:
;   (class Counter (count)
;     (init (n) (set! count n))
;     (method increment () (set! count (+ count 1)) count))
;
;   (def c (actor/new "Counter" 0))
;   (call c :increment)  ; => 1

; Internal actor loop function (used by spawned processes)
; This version takes explicit arguments instead of variadic
(def __actor-loop-0__ (fun (class-name)
  (begin
    (def instance (object/new class-name))

    (def loop (fun ()
      (begin
        (def msg (recv))
        (def sender (head msg))
        (def data (head (tail msg)))
        ; data is either a string (method name) or a list (method-name . args)
        (def method-name
          (cond
            ((== (type/of data) "STRING") data)
            ((== (type/of data) "LIST") (head data))
            (else data)))
        (def method-args
          (cond
            ((== (type/of data) "STRING") (list))
            ((== (type/of data) "LIST") (tail data))
            (else (list))))

        (def result
          (try
            (cond
              ((list/empty? method-args)
                (method/call instance method-name))
              ((== (list/length method-args) 1)
                (method/call instance method-name (head method-args)))
              ((== (list/length method-args) 2)
                (method/call instance method-name (head method-args) (head (tail method-args))))
              (else
                (list "error" "Too many method arguments")))
            (catch e
              (list "error" e))))

        (send sender result)
        (loop))))

    (loop))))

(def __actor-loop-1__ (fun (class-name arg1)
  (begin
    (def instance (object/new class-name arg1))

    (def loop (fun ()
      (begin
        (def msg (recv))
        (def sender (head msg))
        (def data (head (tail msg)))
        ; data is either a string (method name) or a list (method-name . args)
        (def method-name
          (cond
            ((== (type/of data) "STRING") data)
            ((== (type/of data) "LIST") (head data))
            (else data)))
        (def method-args
          (cond
            ((== (type/of data) "STRING") (list))
            ((== (type/of data) "LIST") (tail data))
            (else (list))))

        (def result
          (try
            (cond
              ((list/empty? method-args)
                (method/call instance method-name))
              ((== (list/length method-args) 1)
                (method/call instance method-name (head method-args)))
              ((== (list/length method-args) 2)
                (method/call instance method-name (head method-args) (head (tail method-args))))
              (else
                (list "error" "Too many method arguments")))
            (catch e
              (list "error" e))))

        (send sender result)
        (loop))))

    (loop))))

(def __actor-loop-2__ (fun (class-name arg1 arg2)
  (begin
    (def instance (object/new class-name arg1 arg2))

    (def loop (fun ()
      (begin
        (def msg (recv))
        (def sender (head msg))
        (def data (head (tail msg)))
        ; data is either a string (method name) or a list (method-name . args)
        (def method-name
          (cond
            ((== (type/of data) "STRING") data)
            ((== (type/of data) "LIST") (head data))
            (else data)))
        (def method-args
          (cond
            ((== (type/of data) "STRING") (list))
            ((== (type/of data) "LIST") (tail data))
            (else (list))))

        (def result
          (try
            (cond
              ((list/empty? method-args)
                (method/call instance method-name))
              ((== (list/length method-args) 1)
                (method/call instance method-name (head method-args)))
              ((== (list/length method-args) 2)
                (method/call instance method-name (head method-args) (head (tail method-args))))
              (else
                (list "error" "Too many method arguments")))
            (catch e
              (list "error" e))))

        (send sender result)
        (loop))))

    (loop))))

; actor/new: Create an actor from a class (0 args)
(def actor/new-0 (fun (class-name)
  (spawn __actor-loop-0__ class-name)))

; actor/new: Create an actor from a class (1 arg)
(def actor/new-1 (fun (class-name arg1)
  (spawn __actor-loop-1__ class-name arg1)))

; actor/new: Create an actor from a class (2 args)
(def actor/new-2 (fun (class-name arg1 arg2)
  (spawn __actor-loop-2__ class-name arg1 arg2)))

; call: Synchronous RPC-style call to an actor (no args)
(def call-0 (fun (actor-pid method-name)
  (begin
    (send actor-pid method-name)
    (def response (recv))
    (head (tail response)))))

; call: Synchronous RPC-style call to an actor (1 arg)
(def call-1 (fun (actor-pid method-name arg1)
  (begin
    (send actor-pid (cons method-name (list arg1)))
    (def response (recv))
    (head (tail response)))))

; call: Synchronous RPC-style call to an actor (2 args)
(def call-2 (fun (actor-pid method-name arg1 arg2)
  (begin
    (send actor-pid (cons method-name (list arg1 arg2)))
    (def response (recv))
    (head (tail response)))))
