
(include "TestSimple.sl")

(diag "Process namespace tests - Ping/Pong")

; Define a simple pong responder that echoes back messages
(defun pong-server ()
  (begin
    (defun msg (recv))
    (defun sender (head msg))
    (defvar data (head (tail msg)))
    (send sender (string/concat "pong: " data))))

; Test 1: Basic ping-pong
(defun pong-pid (spawn pong-server))
(send pong-pid "hello")
(defun response (recv))
(is (head (tail response)) "pong: hello" "... basic ping-pong works")

; Test 2: Multiple pings to same server
(defun pong-pid2 (spawn pong-server))
(send pong-pid2 "first")
(defun resp1 (recv))
(is (head (tail resp1)) "pong: first" "... first message received")

; Test 3: Ping-pong with numbers
(defun number-pong ()
  (begin
    (defun msg (recv))
    (defun sender (head msg))
    (defvar num (head (tail msg)))
    (send sender (* num 2))))

(defun num-pid (spawn number-pong))
(send num-pid 21)
(defun num-response (recv))
(is (head (tail num-response)) 42 "... number ping-pong works")

; Test 4: Process with state (using spawn with arguments)
(defun adder (x)
  (begin
    (defun msg (recv))
    (defun sender (head msg))
    (defvar num (head (tail msg)))
    (send sender (+ x num))))

(defun adder-pid (spawn adder 10))
(send adder-pid 5)
(defun add-result (recv))
(is (head (tail add-result)) 15 "... stateful adder works")

; Test 5: Process self-identification
(defun echo-with-self ()
  (begin
    (defun my-pid (process/self))
    (defun msg (recv))
    (defun sender (head msg))
    (send sender my-pid)))

(defun echo-pid (spawn echo-with-self))
(send echo-pid "who-are-you")
(defun self-response (recv))
(is (head (tail self-response)) echo-pid "... process knows its own PID")

; Test 6: Multiple concurrent processes
(defun responder (msg-prefix)
  (begin
    (defun msg (recv))
    (defun sender (head msg))
    (defvar data (head (tail msg)))
    (send sender (string/concat msg-prefix data))))

(defun pid-a (spawn responder "A:"))
(defun pid-b (spawn responder "B:"))
(defun pid-c (spawn responder "C:"))

(send pid-a "test")
(send pid-b "test")
(send pid-c "test")

; Collect responses (order may vary)
(defun responses (list))
(set! responses (cons (head (tail (recv))) responses))
(set! responses (cons (head (tail (recv))) responses))
(set! responses (cons (head (tail (recv))) responses))

(ok (list/includes? responses "A:test") "... process A responded")
(ok (list/includes? responses "B:test") "... process B responded")
(ok (list/includes? responses "C:test") "... process C responded")

; Test 7: Two-way ping-pong conversation
(defun chatty-process ()
  (begin
    ; Receive first message
    (defun msg1 (recv))
    (defun sender (head msg1))
    (send sender "hello")

    ; Receive second message
    (defun msg2 (recv))
    (send sender "goodbye")))

(defun chat-pid (spawn chatty-process))
(send chat-pid "hi")
(defun greeting (recv))
(is (head (tail greeting)) "hello" "... first message in conversation")

(send chat-pid "bye")
(defun farewell (recv))
(is (head (tail farewell)) "goodbye" "... second message in conversation")

(done)
