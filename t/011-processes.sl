
(include "TestSimple.sl")

(diag "Process namespace tests - Ping/Pong")

; Define a simple pong responder that echoes back messages
(def pong-server ()
  (begin
    (def msg (recv))
    (def sender (head msg))
    (def data (head (tail msg)))
    (send sender (string/concat "pong: " data))))

; Test 1: Basic ping-pong
(def pong-pid (spawn pong-server))
(send pong-pid "hello")
(def response (recv))
(is (head (tail response)) "pong: hello" "... basic ping-pong works")

; Test 2: Multiple pings to same server
(def pong-pid2 (spawn pong-server))
(send pong-pid2 "first")
(def resp1 (recv))
(is (head (tail resp1)) "pong: first" "... first message received")

; Test 3: Ping-pong with numbers
(def number-pong ()
  (begin
    (def msg (recv))
    (def sender (head msg))
    (def num (head (tail msg)))
    (send sender (* num 2))))

(def num-pid (spawn number-pong))
(send num-pid 21)
(def num-response (recv))
(is (head (tail num-response)) 42 "... number ping-pong works")

; Test 4: Process with state (using spawn with arguments)
(def adder (x)
  (begin
    (def msg (recv))
    (def sender (head msg))
    (def num (head (tail msg)))
    (send sender (+ x num))))

(def adder-pid (spawn adder 10))
(send adder-pid 5)
(def add-result (recv))
(is (head (tail add-result)) 15 "... stateful adder works")

; Test 5: Process self-identification
(def echo-with-self ()
  (begin
    (def my-pid (process/self))
    (def msg (recv))
    (def sender (head msg))
    (send sender my-pid)))

(def echo-pid (spawn echo-with-self))
(send echo-pid "who-are-you")
(def self-response (recv))
(is (head (tail self-response)) echo-pid "... process knows its own PID")

; Test 6: Multiple concurrent processes
(def responder (msg-prefix)
  (begin
    (def msg (recv))
    (def sender (head msg))
    (def data (head (tail msg)))
    (send sender (string/concat msg-prefix data))))

(def pid-a (spawn responder "A:"))
(def pid-b (spawn responder "B:"))
(def pid-c (spawn responder "C:"))

(send pid-a "test")
(send pid-b "test")
(send pid-c "test")

; Collect responses (order may vary)
(def responses (list))
(set! responses (cons (head (tail (recv))) responses))
(set! responses (cons (head (tail (recv))) responses))
(set! responses (cons (head (tail (recv))) responses))

(ok (list/includes? responses "A:test") "... process A responded")
(ok (list/includes? responses "B:test") "... process B responded")
(ok (list/includes? responses "C:test") "... process C responded")

; Test 7: Two-way ping-pong conversation
(def chatty-process ()
  (begin
    ; Receive first message
    (def msg1 (recv))
    (def sender (head msg1))
    (send sender "hello")

    ; Receive second message
    (def msg2 (recv))
    (send sender "goodbye")))

(def chat-pid (spawn chatty-process))
(send chat-pid "hi")
(def greeting (recv))
(is (head (tail greeting)) "hello" "... first message in conversation")

(send chat-pid "bye")
(def farewell (recv))
(is (head (tail farewell)) "goodbye" "... second message in conversation")

(done)
