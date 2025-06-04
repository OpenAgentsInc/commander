#!/usr/bin/env python3

"""Simple test to verify convert_uncertainties function definition."""

import sys
import os

# Add the astropy-temp directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'astropy-temp'))

# Import the module directly
from astropy.nddata.nduncertainty import convert_uncertainties, StdDevUncertainty, VarianceUncertainty
import numpy as np

def test_basic_functionality():
    """Test basic functionality without full astropy setup."""
    print("Testing convert_uncertainties function...")
    
    # Create a simple uncertainty
    std_uncert = StdDevUncertainty([0.1, 0.2, 0.3])
    
    # Test the function exists and can be called
    var_uncert = convert_uncertainties(std_uncert, VarianceUncertainty)
    
    # Check the result
    expected = np.array([0.01, 0.04, 0.09])
    assert np.allclose(var_uncert.array, expected), f"Expected {expected}, got {var_uncert.array}"
    
    print("✓ convert_uncertainties function works correctly!")
    print(f"  Input (StdDev): {std_uncert.array}")
    print(f"  Output (Variance): {var_uncert.array}")
    
    return True

if __name__ == "__main__":
    test_basic_functionality()