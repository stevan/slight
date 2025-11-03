; Custom math utilities that don't shadow builtins
(defun mymath/double (x) (* x 2))
(defun mymath/square (x) (* x x))
(defun mymath/cube (x) (* x (* x x)))
(defun mymath/area-of-circle (r) (* (math/pi) (* r r)))
(defun mymath/circumference (r) (* (* 2 (math/pi)) r))
