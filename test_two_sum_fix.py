#!/usr/bin/env python3
"""Test a fixed version of two_sum."""

import numpy as np


def two_sum_original(a, b):
    """Original implementation."""
    x = a + b
    eb = x - a  # bvirtual in Shewchuk
    ea = x - eb  # avirtual in Shewchuk
    eb = b - eb  # broundoff in Shewchuk
    ea = a - ea  # aroundoff in Shewchuk
    return x, ea + eb


def two_sum_fixed(a, b):
    """Fixed implementation that handles overflow."""
    x = a + b
    
    # Check if the sum resulted in overflow/underflow to infinity
    if np.isinf(x):
        # If x is infinite, we can't do the normal error calculation
        # Return (x, nan) to indicate the error is undefined
        return x, np.nan
    
    eb = x - a  # bvirtual in Shewchuk
    ea = x - eb  # avirtual in Shewchuk
    eb = b - eb  # broundoff in Shewchuk
    ea = a - ea  # aroundoff in Shewchuk
    err = ea + eb
    
    # If any intermediate calculation resulted in infinity, 
    # the error is undefined
    if np.isinf(eb) or np.isinf(ea) or np.isinf(err):
        return x, np.nan
        
    return x, err


# Test the failing example
f1 = -3.089785075544792e307
f2 = 1.7976931348623157e308

print('Testing the failing case:')
print(f'f1 = {f1}')
print(f'f2 = {f2}')
print()

print("Original implementation:")
result1 = two_sum_original(f1, f2)
print(f'two_sum(f1, f2) = {result1}')
result2 = two_sum_original(f2, f1)
print(f'two_sum(f2, f1) = {result2}')
print(f'Are they equal? {np.array_equal(result1, result2)}')

print("\nFixed implementation:")
result1 = two_sum_fixed(f1, f2)
print(f'two_sum(f1, f2) = {result1}')
result2 = two_sum_fixed(f2, f1)
print(f'two_sum(f2, f1) = {result2}')
print(f'Are they equal? {np.array_equal(result1, result2)}')

# Test some other edge cases
print("\nTesting other cases:")
cases = [
    (1.0, 2.0),
    (1e308, 1e308),
    (-1e308, 1e308),
    (8.988465674311579e307, 8.98846567431158e307),
    (8.988465674311579e307, -8.98846567431158e307),
]

for a, b in cases:
    r1 = two_sum_fixed(a, b)
    r2 = two_sum_fixed(b, a)
    print(f"two_sum({a:.3g}, {b:.3g}) = {r1}, reversed = {r2}, equal? {np.array_equal(r1, r2)}")