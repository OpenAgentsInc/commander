#!/usr/bin/env python3
"""
Test script to reproduce the WCS convergence issue.
"""

import sys
import os
sys.path.insert(0, '/Users/christopherdavid/code/commander/astropy-temp')

from astropy.wcs import WCS, Sip
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt

# Create WCS with the problematic SIP distortion
wcs = WCS(naxis=2)
a = [[ 0.00000000e+00,  0.00000000e+00,  6.77532513e-07,
        -1.76632141e-10],
       [ 0.00000000e+00,  9.49130161e-06, -1.50614321e-07,
         0.00000000e+00],
       [ 7.37260409e-06,  2.07020239e-09,  0.00000000e+00,
         0.00000000e+00],
       [-1.20116753e-07,  0.00000000e+00,  0.00000000e+00,
         0.00000000e+00]]
b = [[ 0.00000000e+00,  0.00000000e+00,  1.34606617e-05,
        -1.41919055e-07],
       [ 0.00000000e+00,  5.85158316e-06, -1.10382462e-09,
         0.00000000e+00],
       [ 1.06306407e-05, -1.36469008e-07,  0.00000000e+00,
         0.00000000e+00],
       [ 3.27391123e-09,  0.00000000e+00,  0.00000000e+00,
         0.00000000e+00]]
crpix = [1221.87375165,  994.90917378]
ap = bp = np.zeros((4, 4))

wcs.sip = Sip(a, b, ap, bp, crpix)

try:
    # This should trigger the NoConvergence error
    plt.subplot(projection=wcs)
    plt.imshow(np.zeros((1944, 2592)))
    plt.grid(color='white', ls='solid')
    print("SUCCESS: No convergence error occurred")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    if "NoConvergence" in str(e) or "converge" in str(e):
        print("This is the expected convergence issue")
    else:
        print("This is a different error")