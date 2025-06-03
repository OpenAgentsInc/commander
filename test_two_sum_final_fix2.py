#!/usr/bin/env python3
"""Final fix for two_sum that avoids intermediate overflow."""

import numpy as np


def two_sum_fixed(a, b):
    """
    Add ``a`` and ``b`` exactly, returning the result as two float64s.
    The first is the approximate sum (with some floating point error)
    and the second is the error of the float64 sum.
    
    This version handles cases where intermediate calculations might overflow
    by detecting the condition and returning nan for the error term.
    """
    x = a + b
    
    # If the sum itself overflows, we can't compute a meaningful error
    if np.isinf(x):
        return x, np.nan
    
    # Check if either x - a or x - b might overflow
    # This happens when x is finite but subtracting one of the operands
    # would result in a value larger than max float
    max_float = np.finfo(float).max
    
    # x - a overflows if x > 0 and a < 0 and x + |a| > max_float
    # x - b overflows if x > 0 and b < 0 and x + |b| > max_float  
    might_overflow_a = (x > 0 and a < 0 and x - a > max_float)
    might_overflow_b = (x > 0 and b < 0 and x - b > max_float)
    
    # Also check the symmetric case where x < 0
    might_overflow_a |= (x < 0 and a > 0 and x - a < -max_float)
    might_overflow_b |= (x < 0 and b > 0 and x - b < -max_float)
    
    # If either might overflow, we can't compute error reliably
    if might_overflow_a or might_overflow_b:
        return x, np.nan
    
    # Standard Shewchuk algorithm
    eb = x - a  # bvirtual in Shewchuk
    ea = x - eb  # avirtual in Shewchuk
    eb = b - eb  # broundoff in Shewchuk
    ea = a - ea  # aroundoff in Shewchuk
    err = ea + eb
    
    # Final check: if we got infinity in the error, return nan
    if np.isinf(err):
        return x, np.nan
        
    return x, err


# Test the failing example
f1 = -3.089785075544792e307
f2 = 1.7976931348623157e308

print('Testing the failing case:')
print(f'f1 = {f1}')
print(f'f2 = {f2}')
print()

print("Fixed implementation:")
result1 = two_sum_fixed(f1, f2)
print(f'two_sum(f1, f2) = {result1}')
result2 = two_sum_fixed(f2, f1)
print(f'two_sum(f2, f1) = {result2}')

print(f'\nTesting with numpy.testing.assert_equal:')
try:
    np.testing.assert_equal(result1, result2)
    print('PASS - Results are equal!')
except AssertionError as e:
    print(f'FAIL - {e}')

# Test some other edge cases
print("\nTesting other cases:")
cases = [
    (1.0, 2.0),
    (1e308, 1e308),
    (-1e308, 1e308),
    (8.988465674311579e307, 8.98846567431158e307),
    (8.988465674311579e307, -8.98846567431158e307),
    (-8.988465674311579e307, -8.98846567431158e307),
    (-7.303128360378417e307, 1.7976931348623157e308),
    # More edge cases
    (1.7976931348623157e308, -1.7976931348623157e308),
    (-1.7976931348623157e308, 1.7976931348623157e308),
    # Small numbers
    (1e-300, 1e-300),
    (1.0, 1e-16),
]

all_pass = True
for a, b in cases:
    r1 = two_sum_fixed(a, b)
    r2 = two_sum_fixed(b, a)
    try:
        np.testing.assert_equal(r1, r2)
        print(f"OK: two_sum({a:.3g}, {b:.3g}) = {r1}")
    except AssertionError:
        print(f"FAIL: two_sum({a:.3g}, {b:.3g}) = {r1}, reversed = {r2}")
        all_pass = False

print(f"\nAll tests pass: {all_pass}")