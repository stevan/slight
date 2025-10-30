
(include "TestSimple.sl")

(diag "Timer namespace tests")

; Simple timer/timeout test
(def timeout-fired false)
(def timeout-id (timer/timeout (fun () (set! timeout-fired true)) 10))
(timer/sleep 50)
(ok timeout-fired "... timeout fired")

; timer/timeout with value capture
(def captured-value 0)
(timer/timeout (fun () (set! captured-value 42)) 10)
(timer/sleep 50)
(is captured-value 42 "... timeout can set values")

; timer/clear to cancel timeout
(def should-not-fire false)
(def cancel-id (timer/timeout (fun () (set! should-not-fire true)) 100))
(timer/clear cancel-id)
(timer/sleep 150)
(ok (not should-not-fire) "... cleared timeout doesn't fire")

; Multiple timeouts
(def count 0)
(timer/timeout (fun () (set! count (+ count 1))) 10)
(timer/timeout (fun () (set! count (+ count 1))) 20)
(timer/timeout (fun () (set! count (+ count 1))) 30)
(timer/sleep 100)
(is count 3 "... multiple timeouts all fire")

; Nested timeouts
(def nested-result 0)
(timer/timeout
  (fun ()
    (begin
      (set! nested-result 1)
      (timer/timeout (fun () (set! nested-result 2)) 10)))
  10)
(timer/sleep 50)
(is nested-result 2 "... nested timeouts work")

; timer/interval test
(def interval-count 0)
(def interval-id
  (timer/interval
    (fun () (set! interval-count (+ interval-count 1)))
    20))
(timer/sleep 100)
(timer/clear interval-id)
(ok (>= interval-count 3) "... interval fires multiple times")

(done)
