#!/usr/bin/env python3
"""Trace through the two_sum algorithm to understand the asymmetry."""

import numpy as np


def two_sum_trace(a, b, label):
    """Trace through two_sum algorithm step by step."""
    print(f"\n{label}:")
    print(f"a = {a}")
    print(f"b = {b}")
    
    x = a + b
    print(f"x = a + b = {x}")
    
    eb = x - a
    print(f"eb = x - a = {x} - {a} = {eb}")
    
    ea = x - eb
    print(f"ea = x - eb = {x} - {eb} = {ea}")
    
    eb_new = b - eb
    print(f"eb_new = b - eb = {b} - {eb} = {eb_new}")
    
    ea_new = a - ea
    print(f"ea_new = a - ea = {a} - {ea} = {ea_new}")
    
    err = ea_new + eb_new
    print(f"err = ea_new + eb_new = {ea_new} + {eb_new} = {err}")
    
    return x, err


# Test the failing example
f1 = -3.089785075544792e307
f2 = 1.7976931348623157e308

result1 = two_sum_trace(f1, f2, "two_sum(f1, f2)")
result2 = two_sum_trace(f2, f1, "two_sum(f2, f1)")

print(f"\nResults:")
print(f"two_sum(f1, f2) = {result1}")
print(f"two_sum(f2, f1) = {result2}")

# Check intermediate calculations
print(f"\nAnalysis:")
print(f"When a is negative and large, x - a = {f1 + f2} - ({f1}) can overflow")
print(f"because it's like {f1 + f2} + {-f1} = {f2}")
print(f"Since f2 is at max float, adding anything positive overflows to inf")