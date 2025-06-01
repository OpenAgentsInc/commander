#!/usr/bin/env python3

import sys
sys.path.insert(0, '/Users/christopherdavid/code/commander/sympy')

from sympy import Sum, symbols

# Test Sum(1, (n, a, b))
n, a, b = symbols('n a b')

# Test case 1: Simple symbolic case
s1 = Sum(1, (n, a, b))
print(f"Sum(1, (n, a, b)) = {s1}")
print(f"Sum(1, (n, a, b)).doit() = {s1.doit()}")

# Test case 2: Numeric case
s2 = Sum(1, (n, 1, 10))
print(f"\nSum(1, (n, 1, 10)) = {s2}")
print(f"Sum(1, (n, 1, 10)).doit() = {s2.doit()}")

# Test case 3: Check if it equals b - a + 1
print(f"\nExpected for Sum(1, (n, a, b)): b - a + 1 = {b - a + 1}")
print(f"Does Sum(1, (n, a, b)).doit() == b - a + 1? {s1.doit() == b - a + 1}")