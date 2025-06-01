#!/usr/bin/env python
"""Test script to reproduce the separability matrix issue with nested CompoundModels"""

# This is just to understand the problem structure
# The actual astropy code would be in the astropy.modeling.separable module

# Expected behavior:
# cm = m.Linear1D(10) & m.Linear1D(5)
# separability_matrix(cm) should give:
# array([[ True, False],
#        [False,  True]])

# m.Pix2Sky_TAN() & m.Linear1D(10) & m.Linear1D(5) should give:
# array([[ True,  True, False, False],
#        [ True,  True, False, False],
#        [False, False,  True, False],
#        [False, False, False,  True]])

# But m.Pix2Sky_TAN() & cm gives incorrect result:
# array([[ True,  True, False, False],
#        [ True,  True, False, False],
#        [False, False,  True,  True],   # Should be [False, False, True, False]
#        [False, False,  True,  True]])  # Should be [False, False, False, True]

# The issue is that when cm (a compound model) is nested within another compound,
# the separability of its components is not preserved correctly.