#!/usr/bin/env python3
"""Test script to reproduce the two_sum issue."""

import numpy as np


def two_sum(a, b):
    """
    Add ``a`` and ``b`` exactly, returning the result as two float64s.
    The first is the approximate sum (with some floating point error)
    and the second is the error of the float64 sum.

    Using the procedure of Shewchuk, 1997,
    Discrete & Computational Geometry 18(3):305-363
    http://www.cs.berkeley.edu/~jrs/papers/robustr.pdf

    Returns
    -------
    sum, err : float64
        Approximate sum of a + b and the exact floating point error
    """
    x = a + b
    eb = x - a  # bvirtual in Shewchuk
    ea = x - eb  # avirtual in Shewchuk
    eb = b - eb  # broundoff in Shewchuk
    ea = a - ea  # aroundoff in Shewchuk
    return x, ea + eb


# Test the failing example
f1 = -3.089785075544792e307
f2 = 1.7976931348623157e308

print('Testing the failing case:')
print(f'f1 = {f1}')
print(f'f2 = {f2}')
print(f'f1 + f2 = {f1 + f2}')
print()

result1 = two_sum(f1, f2)
print(f'two_sum(f1, f2) = {result1}')

result2 = two_sum(f2, f1)
print(f'two_sum(f2, f1) = {result2}')

print()
print('Are they equal?', np.array_equal(result1, result2))

# Let's trace through the algorithm step by step
print("\nDetailed trace for two_sum(f1, f2):")
x = f1 + f2
print(f"x = f1 + f2 = {x}")
eb = x - f1
print(f"eb = x - f1 = {eb}")
ea = x - eb
print(f"ea = x - eb = {ea}")
eb_final = f2 - eb
print(f"eb_final = f2 - eb = {eb_final}")
ea_final = f1 - ea
print(f"ea_final = f1 - ea = {ea_final}")
error1 = ea_final + eb_final
print(f"error1 = ea_final + eb_final = {error1}")

print("\nDetailed trace for two_sum(f2, f1):")
x = f2 + f1
print(f"x = f2 + f1 = {x}")
eb = x - f2
print(f"eb = x - f2 = {eb}")
ea = x - eb
print(f"ea = x - eb = {ea}")
eb_final = f1 - eb
print(f"eb_final = f1 - eb = {eb_final}")
ea_final = f2 - ea
print(f"ea_final = f2 - ea = {ea_final}")
error2 = ea_final + eb_final
print(f"error2 = ea_final + eb_final = {error2}")

# Check if numbers are near max float64
max_float = np.finfo(float).max
print(f"\nmax float64 = {max_float}")
print(f"f2 / max_float = {f2 / max_float}")
print(f"f1 + f2 is inf? {np.isinf(f1 + f2)}")