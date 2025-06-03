#!/usr/bin/env python
"""Test script to reproduce the MagUnit issue"""

import sys
sys.path.insert(0, './astropy-temp/astropy')

from astropy.modeling.models import Const1D
import astropy.units as u

unit = u.ABmag
c = -20.0 * unit
model = Const1D(c)

try:
    result = model(-23.0 * unit)
    print(f"Success! Result: {result}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()