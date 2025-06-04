#!/usr/bin/env python3
"""
Debug script to understand why SCAMP detection logic triggers for CAR-SIP projection.
"""

import sys
import os
sys.path.insert(0, '/Users/christopherdavid/code/commander/astropy-temp')

from astropy.io import fits
from astropy import wcs
import numpy as np

def test_car_sip_debug():
    """Test to understand SCAMP detection logic for CAR-SIP projection."""
    
    print("=" * 60)
    print("DEBUG: CAR-SIP SCAMP Detection Logic")
    print("=" * 60)
    
    # Header from the problem statement
    header_dict = {
        'SIMPLE'  : True, 
        'BITPIX'  : -32, 
        'NAXIS'   :  2,
        'NAXIS1'  : 1024,
        'NAXIS2'  : 1024,
        'CRPIX1'  : 512.0,
        'CRPIX2'  : 512.0,
        'CDELT1'  : 0.01,
        'CDELT2'  : 0.01,
        'CRVAL1'  : 120.0,
        'CRVAL2'  : 29.0,
        'CTYPE1'  : 'RA---CAR-SIP',
        'CTYPE2'  : 'DEC--CAR-SIP',
        'PV1_1'   : 120.0,
        'PV1_2'   : 29.0,
        'PV1_0'   : 1.0,
        'A_ORDER' : 2,
        'A_2_0'   : 5.0e-4,
        'B_ORDER' : 2,
        'B_2_0'   : 5.0e-4
    }
    
    # Create header
    header = fits.Header(header_dict)
    print("Header CTYPE values:")
    print(f"  CTYPE1: '{header['CTYPE1']}'")
    print(f"  CTYPE2: '{header['CTYPE2']}'")
    print()
    
    # Create WCS
    try:
        w = wcs.WCS(header)
        print("WCS object created successfully")
        print(f"WCS.ctype: {w.ctype}")
        print()
        
        # Test the SCAMP detection logic
        print("Testing SCAMP detection logic:")
        print("-" * 40)
        
        for i in range(1, 3):  # i = 1, 2 (corresponding to axis 0, 1)
            ctype_value = w.ctype[i - 1]
            ctype_upper = ctype_value.upper()
            
            print(f"Axis {i}:")
            print(f"  w.ctype[{i-1}] = '{ctype_value}'")
            print(f"  w.ctype[{i-1}].upper() = '{ctype_upper}'")
            
            # Test the condition that's causing issues
            tan_condition = "-TAN" in ctype_upper
            print(f"  '-TAN' in '{ctype_upper}' = {tan_condition}")
            
            if tan_condition:
                print(f"  *** SCAMP logic would trigger for axis {i} ***")
                print(f"  This is the problem! CAR-SIP contains 'TAN' substring")
            print()
        
        # Show what the corrected logic should check
        print("Corrected logic analysis:")
        print("-" * 40)
        
        for i in range(1, 3):
            ctype_value = w.ctype[i - 1]
            ctype_upper = ctype_value.upper()
            
            # Extract the projection code properly
            if "---" in ctype_value:
                projection_part = ctype_value.split("---")[1].upper()
            else:
                projection_part = ctype_upper
            
            print(f"Axis {i}:")
            print(f"  Full CTYPE: '{ctype_value}'")
            print(f"  Projection part: '{projection_part}'")
            
            # Check different conditions
            is_tan_projection = projection_part.startswith("TAN")
            contains_tan = "-TAN" in ctype_upper
            
            print(f"  projection_part.startswith('TAN'): {is_tan_projection}")
            print(f"  '-TAN' in ctype_upper: {contains_tan}")
            print(f"  Should SCAMP logic apply: {is_tan_projection}")
            print()
            
    except Exception as e:
        print(f"Error creating WCS: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_car_sip_debug()