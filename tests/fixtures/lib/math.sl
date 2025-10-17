; Custom math utilities that don't shadow builtins
(def mymath/double (x) (* x 2))
(def mymath/square (x) (* x x))
(def mymath/cube (x) (* x (* x x)))
(def mymath/area-of-circle (r) (* (math/pi) (* r r)))
(def mymath/circumference (r) (* (* 2 (math/pi)) r))
