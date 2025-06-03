#!/usr/bin/env python3

import numpy as np
import sys
import os

# Add the astropy path to test the issue
sys.path.insert(0, '/Users/christopherdavid/code/commander/astropy-temp/astropy')

from astropy.coordinates import Latitude
import astropy.units as u

print("Testing the float32 pi/2 issue with Latitude")
print("=" * 50)

# Test the problematic case
lat_float32 = np.float32(np.pi/2)
print(f"np.pi/2 = {np.pi/2}")
print(f"np.float32(np.pi/2) = {lat_float32}")
print(f"Difference: {lat_float32 - np.pi/2}")

print("\nTesting dtype precision:")
print(f"np.finfo(np.float32).eps = {np.finfo(np.float32).eps}")
print(f"np.finfo(np.float64).eps = {np.finfo(np.float64).eps}")

try:
    result = Latitude(lat_float32, 'rad')
    print(f"Success: {result}")
except ValueError as e:
    print(f"ValueError: {e}")

# Also test negative case
lat_float32_neg = np.float32(-np.pi/2)
print(f"\nnp.float32(-np.pi/2) = {lat_float32_neg}")
print(f"Difference from -pi/2: {lat_float32_neg - (-np.pi/2)}")

try:
    result = Latitude(lat_float32_neg, 'rad')
    print(f"Success: {result}")
except ValueError as e:
    print(f"ValueError: {e}")