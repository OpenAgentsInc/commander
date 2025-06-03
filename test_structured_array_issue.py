#!/usr/bin/env python
import numpy as np
from astropy.utils.masked import Masked
import astropy.units as u

# Test case from the issue
# Create a structured array with array-valued field
q = ((np.random.beta(2,5, 100)-(2/7))/2 + 3) * u.kpc
new_dtype = np.dtype({'names': ['samples'],
                      'formats': [(q.dtype, (q.shape[-1],))]})
q = q.view(new_dtype)

print("Shape of structured array:", q.shape)
print("Dtype:", q.dtype)

# This should fail with the original code
try:
    x = Masked(q)
    print("\nMasked array created successfully")
    print("Repr of masked structured array:")
    print(repr(x))
except Exception as e:
    print("\nError creating/printing Masked array:")
    print(type(e).__name__, ":", e)

# Also test a simpler structured array
print("\n\nTesting simpler structured array:")
simple_struct = np.array([(1, 2.0), (3, 4.0)], dtype=[('x', 'i4'), ('y', 'f4')])
try:
    x2 = Masked(simple_struct)
    print("Simple structured array masked successfully")
    print(repr(x2))
except Exception as e:
    print("Error with simple structured array:")
    print(type(e).__name__, ":", e)