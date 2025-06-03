#!/usr/bin/env python3
"""
Test script to reproduce the zero-length array printing issue.
"""

import numpy as np
import sys
import os

# Add the astropy package to path
sys.path.insert(0, '/Users/christopherdavid/code/commander/astropy-temp/astropy')

try:
    from astropy.table import Table
    
    # Create the test data from the issue description
    events = [
        {"A": 0, "B": 0, "C": np.array([], dtype=np.uint64)},
        {"A": 1, "B": 0, "C": np.array([], dtype=np.uint64)},
        {"A": 2, "B": 2, "C": np.array([0, 1], dtype=np.uint64)}
    ]
    
    print("Testing with just the first event (should work):")
    try:
        table1 = Table(rows=events[:1])
        print(repr(table1))
        print("SUCCESS: First event works")
    except Exception as e:
        print(f"ERROR with first event: {e}")
    
    print("\nTesting with first 2 events (should fail):")
    try:
        table2 = Table(rows=events[:2])
        print(repr(table2))
        print("SUCCESS: First 2 events work")
    except Exception as e:
        print(f"ERROR with first 2 events: {e}")
        import traceback
        traceback.print_exc()
    
    print("\nTesting with all 3 events (should work):")
    try:
        table3 = Table(rows=events)
        print(repr(table3))
        print("SUCCESS: All 3 events work")
    except Exception as e:
        print(f"ERROR with all 3 events: {e}")

except ImportError as e:
    print(f"Failed to import astropy: {e}")
    print("Make sure astropy is available in the astropy-temp directory")