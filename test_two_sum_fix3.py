#!/usr/bin/env python3
"""Test a better fix for two_sum that ensures symmetry."""

import numpy as np


def two_sum_fixed(a, b):
    """
    Fixed implementation that ensures symmetry by checking for potential overflow
    and handling it consistently regardless of argument order.
    """
    x = a + b
    
    # If the sum overflows to infinity, both orders should return (inf, nan)
    if np.isinf(x):
        return x, np.nan
    
    # Check which order to use based on magnitudes to avoid intermediate overflow
    # The key insight is that x - a can overflow if a is negative and large
    # while x is positive and large. We want to subtract the value with smaller
    # magnitude from x first.
    if abs(a) <= abs(b):
        # Standard order: compute x - a first
        eb = x - a  # bvirtual in Shewchuk
        ea = x - eb  # avirtual in Shewchuk
        eb = b - eb  # broundoff in Shewchuk
        ea = a - ea  # aroundoff in Shewchuk
    else:
        # Reversed order: compute x - b first
        ea = x - b  # avirtual in Shewchuk
        eb = x - ea  # bvirtual in Shewchuk
        ea = a - ea  # aroundoff in Shewchuk
        eb = b - eb  # broundoff in Shewchuk
    
    err = ea + eb
    
    # If any calculation resulted in infinity, return nan for error
    if np.isinf(ea) or np.isinf(eb) or np.isinf(err):
        return x, np.nan
        
    return x, err


def arrays_equal_with_nan(a, b):
    """Check if two arrays are equal, treating nan as equal to nan."""
    return np.array_equal(a, b) or (np.isnan(a).all() and np.isnan(b).all()) or \
           (len(a) == 2 and len(b) == 2 and a[0] == b[0] and np.isnan(a[1]) and np.isnan(b[1]))


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
print(f'Are they equal? {arrays_equal_with_nan(result1, result2)}')

# Test with numpy testing which handles nan correctly
print(f'numpy.testing.assert_equal passes? ', end='')
try:
    np.testing.assert_equal(result1, result2)
    print('Yes')
except AssertionError:
    print('No')

# The issue is that numpy.testing.assert_equal considers nan != nan
# Let's see what the actual test expects
print("\nChecking what test expects:")
print("The test uses np.testing.assert_equal which treats nan != nan")
print("So we need to ensure both return the same value, not nan")

# Actually, looking more carefully at the error trace, the issue is that
# one returns nan and the other returns a finite value. We need to ensure
# both return the same thing.