#!/usr/bin/env python
import sys
sys.path.insert(0, 'sympy')

from sympy import Sum, symbols

# Test the current behavior
n, a, b = symbols('n a b', integer=True)

# Test Sum(1, (n, a, b))
result = Sum(1, (n, a, b)).doit()
print(f"Sum(1, (n, a, b)).doit() = {result}")
print(f"Expected: b - a + 1")

# Test with specific numeric values
result2 = Sum(1, (n, 0, 5)).doit()
print(f"\nSum(1, (n, 0, 5)).doit() = {result2}")
print(f"Expected: 6")

result3 = Sum(1, (n, 3, 8)).doit()
print(f"\nSum(1, (n, 3, 8)).doit() = {result3}")
print(f"Expected: 6")