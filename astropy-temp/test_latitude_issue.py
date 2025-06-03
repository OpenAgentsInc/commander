#!/usr/bin/env python3
"""Test script to reproduce the Latitude float32 issue"""

import numpy as np
from astropy.coordinates import Latitude
import astropy.units as u

# Test 1: Direct float32 value
print("Test 1: Direct float32 value")
lat_f32 = np.float32(np.pi/2)
print(f"float32 value: {lat_f32}")
print(f"float64 representation: {np.float64(lat_f32)}")

try:
    lat = Latitude(lat_f32, 'rad')
    print("Success: Latitude created")
except ValueError as e:
    print(f"Error: {e}")

print("\n" + "="*50 + "\n")

# Test 2: Array of float32 values
print("Test 2: Array of float32 values")
lat_array_f32 = np.array([np.pi/2, -np.pi/2], dtype=np.float32)
print(f"float32 array: {lat_array_f32}")
print(f"float64 representation: {lat_array_f32.astype(np.float64)}")

try:
    lat_array = Latitude(lat_array_f32, 'rad')
    print("Success: Latitude array created")
except ValueError as e:
    print(f"Error: {e}")

print("\n" + "="*50 + "\n")

# Test 3: Check the exact comparison values
print("Test 3: Comparison values")
print(f"pi/2 in float64: {np.pi/2}")
print(f"pi/2 in float32: {np.float32(np.pi/2)}")
print(f"float64(float32(pi/2)): {np.float64(np.float32(np.pi/2))}")
print(f"Difference: {np.float64(np.float32(np.pi/2)) - np.pi/2}")
print(f"float32 machine epsilon: {np.finfo(np.float32).eps}")