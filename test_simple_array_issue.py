#!/usr/bin/env python3
"""
Simple test to understand the array shape issue.
"""

import numpy as np

# Create arrays like in the issue
arr1 = np.array([], dtype=np.uint64)
arr2 = np.array([0, 1], dtype=np.uint64)

print("Empty array:")
print(f"  arr1 = {arr1}")
print(f"  arr1.shape = {arr1.shape}")
print(f"  arr1.shape[1:] = {arr1.shape[1:]}")
print(f"  bool(arr1.shape[1:]) = {bool(arr1.shape[1:])}")

print("\nNon-empty array:")
print(f"  arr2 = {arr2}")
print(f"  arr2.shape = {arr2.shape}")
print(f"  arr2.shape[1:] = {arr2.shape[1:]}")
print(f"  bool(arr2.shape[1:]) = {bool(arr2.shape[1:])}")

# Test what happens when we make an array from list of empty arrays
empty_arrays = [[], []]
result1 = np.array(empty_arrays)
print(f"\nnp.array([[], []]) = {result1}")
print(f"  shape = {result1.shape}")
print(f"  shape[1:] = {result1.shape[1:]}")
print(f"  bool(shape[1:]) = {bool(result1.shape[1:])}")
print(f"  0 in shape[1:] = {0 in result1.shape[1:]}")

# Test with mixed arrays
mixed_arrays = [[], [], [1, 2]]
result2 = np.array(mixed_arrays, dtype=object)
print(f"\nnp.array([[], [], [1, 2]], dtype=object) = {result2}")
print(f"  shape = {result2.shape}")
print(f"  shape[1:] = {result2.shape[1:]}")
print(f"  bool(shape[1:]) = {bool(result2.shape[1:])}")