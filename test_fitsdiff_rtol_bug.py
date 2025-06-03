#!/usr/bin/env python
"""Test to demonstrate the FITSDiff rtol bug with multidimensional columns."""

import numpy as np
from astropy.io import fits
from astropy.io.fits import FITSDiff
import tempfile
import os

# Create test data with small differences
nrows = 5
# Create multidimensional column data (e.g., 2D arrays in each row)
col1_a = np.array([np.array([1.0, 2.0]) for _ in range(nrows)], dtype=object)
col1_b = np.array([np.array([1.0, 2.0]) for _ in range(nrows)], dtype=object)

# Introduce a small difference in one element
col1_b[2] = np.array([1.0, 2.0 + 1e-11])

# Create regular column data
col2_a = np.arange(nrows, dtype=np.float64)
col2_b = col2_a.copy()
col2_b[3] += 1e-11  # Small difference

# Create FITS tables
cols_a = [
    fits.Column(name='MULTIDIM', format='2E', array=col1_a),
    fits.Column(name='REGULAR', format='E', array=col2_a)
]
cols_b = [
    fits.Column(name='MULTIDIM', format='2E', array=col1_b),
    fits.Column(name='REGULAR', format='E', array=col2_b)
]

hdu_a = fits.BinTableHDU.from_columns(cols_a)
hdu_b = fits.BinTableHDU.from_columns(cols_b)

# Save to temporary files
with tempfile.NamedTemporaryFile(suffix='.fits', delete=False) as f1:
    fname1 = f1.name
with tempfile.NamedTemporaryFile(suffix='.fits', delete=False) as f2:
    fname2 = f2.name

try:
    hdul_a = fits.HDUList([fits.PrimaryHDU(), hdu_a])
    hdul_b = fits.HDUList([fits.PrimaryHDU(), hdu_b])
    
    hdul_a.writeto(fname1, overwrite=True)
    hdul_b.writeto(fname2, overwrite=True)
    
    # Test with rtol that should consider these values as equal
    print("Testing FITSDiff with rtol=0.01 (should consider 1e-11 differences as equal)")
    print("=" * 70)
    
    diff = FITSDiff(fname1, fname2, rtol=0.01)
    diff.report()
    
    print("\n" + "=" * 70)
    print("Summary:")
    print(f"Files identical according to FITSDiff: {diff.identical}")
    print(f"Number of HDUs with differences: {len(diff.diff_hdus)}")
    
    if diff.diff_hdus:
        for idx, hdu_diff, extname, extver in diff.diff_hdus:
            print(f"\nHDU {idx} differences:")
            if hdu_diff.diff_data:
                print(f"  Data differences found: {not hdu_diff.diff_data.identical}")
                print(f"  Total different values: {hdu_diff.diff_data.diff_total}")
                print(f"  Stored diff values: {len(hdu_diff.diff_data.diff_values)}")
                
                # Check the actual differences
                for (col, row), (val_a, val_b) in hdu_diff.diff_data.diff_values:
                    print(f"\n  Column '{col}', Row {row}:")
                    print(f"    Value A: {val_a}")
                    print(f"    Value B: {val_b}")
                    if isinstance(val_a, np.ndarray) and isinstance(val_b, np.ndarray):
                        print(f"    Max absolute diff: {np.max(np.abs(val_a - val_b))}")
                        print(f"    Within rtol=0.01? {np.allclose(val_a, val_b, rtol=0.01)}")
    
finally:
    # Clean up
    os.unlink(fname1)
    os.unlink(fname2)