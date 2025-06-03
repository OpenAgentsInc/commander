#!/usr/bin/env python
"""Test script to reproduce the nutation_matrix issue"""

# First, let's create a minimal version that shows the issue
import numpy as np
from astropy import units as u
from astropy.time import Time
from astropy.coordinates.matrix_utilities import rotation_matrix, matrix_product

def nutation_components2000B_mock(jd):
    """Mock version that returns dummy values in radians"""
    return 0.1, 0.01, 0.001  # epsa, dpsi, deps in radians

def nutation_matrix_old(epoch):
    """Old version with the bug"""
    epsa, dpsi, deps = nutation_components2000B_mock(epoch.jd)  # all in radians
    
    return matrix_product(rotation_matrix(-(epsa + deps), 'x', False),
                          rotation_matrix(-dpsi, 'z', False),
                          rotation_matrix(epsa, 'x', False))

def nutation_matrix_fixed(epoch):
    """Fixed version with u.radian"""
    epsa, dpsi, deps = nutation_components2000B_mock(epoch.jd)  # all in radians
    
    return matrix_product(rotation_matrix(-(epsa + deps), 'x', u.radian),
                          rotation_matrix(-dpsi, 'z', u.radian),
                          rotation_matrix(epsa, 'x', u.radian))

# Test both versions
epoch = Time('J2000')

print("Testing old version (should fail):")
try:
    result_old = nutation_matrix_old(epoch)
    print("Old version succeeded (unexpected)")
except Exception as e:
    print(f"Old version failed as expected: {type(e).__name__}: {e}")

print("\nTesting fixed version:")
try:
    result_fixed = nutation_matrix_fixed(epoch)
    print("Fixed version succeeded")
    print(f"Result shape: {result_fixed.shape}")
except Exception as e:
    print(f"Fixed version failed: {type(e).__name__}: {e}")