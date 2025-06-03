#!/usr/bin/env python3
"""Test the bounds used in the test."""

import numpy as np

max_val = np.finfo(float).max
min_val = np.finfo(float).min

print(f"float64 max: {max_val}")
print(f"float64 min: {min_val}")
print(f"max / 2: {max_val / 2}")
print(f"min / 2: {min_val / 2}")

# Check if the sum can still overflow with the bounds
f1 = min_val / 2
f2 = max_val / 2
print(f"\nf1 = min/2 = {f1}")
print(f"f2 = max/2 = {f2}")
print(f"f1 + f2 = {f1 + f2}")

# Check the problematic example
f1 = -3.089785075544792e307
f2 = 1.7976931348623157e308
print(f"\nProblematic example:")
print(f"f1 = {f1}")
print(f"f2 = {f2}")
print(f"f1 + f2 = {f1 + f2}")
print(f"Is f1 within bounds? {min_val / 2 <= f1 <= max_val / 2}")
print(f"Is f2 within bounds? {min_val / 2 <= f2 <= max_val / 2}")
print(f"f2 == max_val? {f2 == max_val}")
print(f"f2 > max_val / 2? {f2 > max_val / 2}")