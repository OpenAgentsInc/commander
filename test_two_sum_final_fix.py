#!/usr/bin/env python3
"""Final fix for two_sum that avoids intermediate overflow."""

import numpy as np


def two_sum_fixed(a, b):
    """
    Add ``a`` and ``b`` exactly, returning the result as two float64s.
    The first is the approximate sum (with some floating point error)
    and the second is the error of the float64 sum.
    
    This version handles cases where intermediate calculations might overflow.
    """
    x = a + b
    
    # If the sum itself overflows, we can't compute a meaningful error
    if np.isinf(x):
        return x, np.nan
    
    # To avoid overflow in x - a when a is large and negative,
    # we check if x - a might overflow. This happens when:
    # x > 0 and a < 0 and |a| is large, because x - a = x - (-|a|) = x + |a|
    # 
    # Similarly, x - b might overflow when x > 0 and b < 0 and |b| is large
    
    # Choose the order that avoids overflow
    if x > 0 and a < 0 and abs(a) > np.finfo(float).max / 2:
        # x - a might overflow, use x - b first
        eb = x - b
        ea = x - eb
        ea_new = a - ea
        eb_new = b - eb
    elif x > 0 and b < 0 and abs(b) > np.finfo(float).max / 2:
        # x - b might overflow, use x - a first
        eb = x - a
        ea = x - eb
        eb_new = b - eb
        ea_new = a - ea
    else:
        # Standard Shewchuk algorithm - no overflow risk
        eb = x - a  # bvirtual in Shewchuk
        ea = x - eb  # avirtual in Shewchuk
        eb_new = b - eb  # broundoff in Shewchuk
        ea_new = a - ea  # aroundoff in Shewchuk
    
    err = ea_new + eb_new
    
    # If we still got infinity somehow, return nan
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