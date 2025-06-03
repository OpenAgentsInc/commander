#!/usr/bin/env python
"""Test script to reproduce the ECSV datetime64 serialization issue"""

import sys
import os
sys.path.insert(0, './astropy-temp/astropy')

import numpy as np
from astropy.table import Table
from astropy.time import Time
import tempfile

# Create a table with a datetime64 column
dates = np.array(['2020-01-01', '2020-01-02', '2020-01-03'], dtype='datetime64')
t = Table()
t['dates'] = dates
t['values'] = [1, 2, 3]

print("Original table:")
print(t)
print(f"Column 'dates' dtype: {t['dates'].dtype}")

# Try to write to ECSV
try:
    with tempfile.NamedTemporaryFile(mode='w', suffix='.ecsv', delete=False) as f:
        filename = f.name
    
    t.write(filename, format='ascii.ecsv', overwrite=True)
    print(f"\nSuccessfully wrote to {filename}")
    
    # Try to read it back
    t2 = Table.read(filename, format='ascii.ecsv')
    print("\nRead back table:")
    print(t2)
    print(f"Column 'dates' dtype: {t2['dates'].dtype}")
    
except Exception as e:
    print(f"\nError: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
finally:
    if 'filename' in locals() and os.path.exists(filename):
        os.unlink(filename)