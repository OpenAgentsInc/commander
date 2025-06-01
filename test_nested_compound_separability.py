#!/usr/bin/env python
"""Test script to reproduce the nested compound model separability issue"""

import numpy as np
from astropy.modeling import models as m
from astropy.modeling.separable import separability_matrix

# Create individual models
pix2sky = m.Pix2Sky_TAN()
linear1 = m.Linear1D(10)
linear2 = m.Linear1D(5)

# Create a compound model
cm = linear1 & linear2
print("Separability matrix for cm (Linear1D & Linear1D):")
print(separability_matrix(cm))
print("Expected:")
print("array([[ True, False],")
print("       [False,  True]])")
print()

# Create nested compound model - direct expansion
direct = pix2sky & linear1 & linear2
print("Separability matrix for direct expansion (Pix2Sky_TAN & Linear1D & Linear1D):")
print(separability_matrix(direct))
print("Expected:")
print("array([[ True,  True, False, False],")
print("       [ True,  True, False, False],")
print("       [False, False,  True, False],")
print("       [False, False, False,  True]])")
print()

# Create nested compound model - using cm
nested = pix2sky & cm
print("Separability matrix for nested (Pix2Sky_TAN & cm):")
print(separability_matrix(nested))
print("Expected (should be same as direct expansion):")
print("array([[ True,  True, False, False],")
print("       [ True,  True, False, False],")
print("       [False, False,  True, False],")
print("       [False, False, False,  True]])")
print()

# Check if they're equal
if np.array_equal(separability_matrix(direct), separability_matrix(nested)):
    print("✓ Test passed: nested compound model separability is preserved correctly")
else:
    print("✗ Test failed: nested compound model separability is NOT preserved correctly")
    print("\nDifference:")
    print(separability_matrix(nested) != separability_matrix(direct))