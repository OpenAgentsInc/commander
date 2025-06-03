#!/usr/bin/env python3
"""
Test the multidims logic directly.
"""

import numpy as np

def test_multidims_logic(shape):
    print(f"Testing shape: {shape}")
    multidims = shape[1:]
    print(f"  multidims = {multidims}")
    print(f"  bool(multidims) = {bool(multidims)}")
    
    if multidims:
        multidim0 = tuple(0 for n in multidims)
        multidim1 = tuple(n - 1 for n in multidims)
        multidims_all_ones = np.prod(multidims) == 1
        multidims_has_zero = 0 in multidims
        
        print(f"  multidim0 = {multidim0}")
        print(f"  multidim1 = {multidim1}")
        print(f"  multidims_all_ones = {multidims_all_ones}")
        print(f"  multidims_has_zero = {multidims_has_zero}")
        
        # Test the conditional logic
        if multidims_all_ones:
            print("  -> Would take multidims_all_ones branch")
        elif multidims_has_zero:
            print("  -> Would take multidims_has_zero branch (return empty string)")
        else:
            print("  -> Would take else branch (left .. right)")
    else:
        print("  -> Variables not defined, would skip multidims logic")
    print()

# Test various shapes
test_multidims_logic((2, 0))  # 2 rows, 0 columns -> multidims = (0,)
test_multidims_logic((0,))    # 0 rows -> multidims = ()
test_multidims_logic((2,))    # 2 rows, 1D -> multidims = ()
test_multidims_logic((2, 3))  # 2 rows, 3 columns -> multidims = (3,)
test_multidims_logic((2, 1))  # 2 rows, 1 column -> multidims = (1,)
test_multidims_logic((2, 1, 1))  # 2 rows, 1x1 -> multidims = (1, 1)