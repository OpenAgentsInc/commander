#!/usr/bin/env python
"""Test the Quantity subok issue"""

import numpy as np

# Simulate the key parts of the issue

class MagUnit:
    """Simplified MagUnit class"""
    pass

class Quantity:
    """Simplified Quantity class"""
    def __init__(self, value, unit, copy=None, subok=False):
        self.value = value
        self.unit = unit
        self.subok = subok
        
        # This is the key check that fails
        if not subok and isinstance(unit, MagUnit):
            raise TypeError("Quantity instances require normal units, not MagUnit instances")
        
        print(f"Quantity created successfully with subok={subok}")

# Test without subok=True
unit = MagUnit()
value = np.array([-20.0])

print("Test 1: Without subok=True")
try:
    q1 = Quantity(value, unit)
    print("Success - no error")
except TypeError as e:
    print(f"Error: {e}")

print("\nTest 2: With subok=True") 
try:
    q2 = Quantity(value, unit, subok=True)
    print("Success - no error")
except TypeError as e:
    print(f"Error: {e}")