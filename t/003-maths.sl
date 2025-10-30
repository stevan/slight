
(include "TestSimple.sl")

(diag "Basic Math tests");

(is (+ 1 1) 2 "... 1 + 1 == 2")
(is (* 2 2) 4 "... 2 * 2 == 4")
(is (- 4 2) 2 "... 4 - 2 == 2")
(is (/ 4 2) 2 "... 4 / 2 == 2")
(is (% 4 2) 0 "... 4 % 2 == 0")

(is (+ 1.5 1.5) 3   "... 1.5 + 1.5 == 3")
(is (+ 1.5 1.7) 3.2 "... 1.5 + 1.7 == 3.2")
(is (* 2.5   2) 5   "... 2.5 * 2 == 5")
(is (* 2.5 0.2) 0.5 "... 2.5 * 0.2 == 0.5")
(is (- 4.5   2) 2.5 "... 4.5 - 2 == 2.5")
(is (/ 4   0.5) 8   "... 4 / 0.5 == 8")

(is (2 * (- 20 5))                 30 "... 2 * (20 - 5) == 30")
(is (2 * (- (* 10 2) 5))           30 "... 2 * ((10 * 2) - 5) == 30")
(is (* (- 3.2 1.2) (- (* 10 2) 5)) 30 "... (3.2 - 1.2) * ((10 * 2) - 5) == 30")

(diag "math/ namespace tests")

; math/mod
(is (math/mod 10 3) 1 "... 10 mod 3 == 1")
(is (math/mod 7 2) 1 "... 7 mod 2 == 1")

; math/abs
(is (math/abs -5) 5 "... abs(-5) == 5")
(is (math/abs 5) 5 "... abs(5) == 5")

; math/floor, math/ceil, math/round, math/trunc
(is (math/floor 3.7) 3 "... floor(3.7) == 3")
(is (math/ceil 3.2) 4 "... ceil(3.2) == 4")
(is (math/round 3.5) 4 "... round(3.5) == 4")
(is (math/round 3.4) 3 "... round(3.4) == 3")
(is (math/trunc 3.9) 3 "... trunc(3.9) == 3")
(is (math/trunc -3.9) -3 "... trunc(-3.9) == -3")

; math/pow and math/sqrt
(is (math/pow 2 3) 8 "... 2^3 == 8")
(is (math/pow 5 2) 25 "... 5^2 == 25")
(is (math/sqrt 16) 4 "... sqrt(16) == 4")
(is (math/sqrt 25) 5 "... sqrt(25) == 5")

; math/min and math/max
(is (math/min 3 1 4 1 5) 1 "... min(3,1,4,1,5) == 1")
(is (math/max 3 1 4 1 5) 5 "... max(3,1,4,1,5) == 5")
(is (math/min 10 20) 10 "... min(10,20) == 10")
(is (math/max 10 20) 20 "... max(10,20) == 20")

; math/sign
(is (math/sign 5) 1 "... sign(5) == 1")
(is (math/sign -5) -1 "... sign(-5) == -1")
(is (math/sign 0) 0 "... sign(0) == 0")

; math/pi and math/e
(ok (> (math/pi) 3.14) "... pi > 3.14")
(ok (< (math/pi) 3.15) "... pi < 3.15")
(ok (> (math/e) 2.71) "... e > 2.71")
(ok (< (math/e) 2.72) "... e < 2.72")

; Trigonometric functions (basic sanity checks)
(is (math/round (* (math/sin 0) 100)) 0 "... sin(0) ≈ 0")
(is (math/round (* (math/cos 0) 100)) 100 "... cos(0) ≈ 1")

(done)
