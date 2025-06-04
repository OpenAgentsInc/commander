#!/usr/bin/env python3

"""Test script to verify the convert_uncertainties helper function."""

import sys
import os

# Add the astropy-temp directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'astropy-temp'))

import numpy as np
from astropy.nddata import StdDevUncertainty, VarianceUncertainty, InverseVariance, convert_uncertainties
from astropy import units as u

def test_std_to_var():
    """Test converting standard deviation to variance."""
    std_uncert = StdDevUncertainty([0.1, 0.2, 0.3])
    var_uncert = convert_uncertainties(std_uncert, VarianceUncertainty)
    
    expected = np.array([0.01, 0.04, 0.09])
    np.testing.assert_allclose(var_uncert.array, expected)
    print("✓ StdDev to Variance conversion works")

def test_var_to_invvar():
    """Test converting variance to inverse variance."""
    var_uncert = VarianceUncertainty([0.01, 0.04, 0.09])
    inv_var_uncert = convert_uncertainties(var_uncert, InverseVariance)
    
    expected = np.array([100., 25., 11.111111])
    np.testing.assert_allclose(inv_var_uncert.array, expected, rtol=1e-5)
    print("✓ Variance to InverseVariance conversion works")

def test_invvar_to_std():
    """Test converting inverse variance to standard deviation."""
    inv_var_uncert = InverseVariance([100., 25., 11.111111])
    std_uncert = convert_uncertainties(inv_var_uncert, StdDevUncertainty)
    
    expected = np.array([0.1, 0.2, 0.3])
    np.testing.assert_allclose(std_uncert.array, expected, rtol=1e-5)
    print("✓ InverseVariance to StdDev conversion works")

def test_with_units():
    """Test conversion with units."""
    std_uncert = StdDevUncertainty([0.1, 0.2], unit=u.m)
    var_uncert = convert_uncertainties(std_uncert, VarianceUncertainty)
    
    expected = np.array([0.01, 0.04])
    np.testing.assert_allclose(var_uncert.array, expected)
    assert var_uncert.unit == u.m**2
    print("✓ Conversion with units works")

def test_chained_conversion():
    """Test chaining multiple conversions."""
    std_uncert = StdDevUncertainty([0.1, 0.2, 0.3])
    var_uncert = convert_uncertainties(std_uncert, VarianceUncertainty)
    inv_var_uncert = convert_uncertainties(var_uncert, InverseVariance)
    final_std = convert_uncertainties(inv_var_uncert, StdDevUncertainty)
    
    np.testing.assert_allclose(final_std.array, std_uncert.array, rtol=1e-10)
    print("✓ Chained conversion works")

def test_identity_conversion():
    """Test converting to the same type (identity)."""
    std_uncert = StdDevUncertainty([0.1, 0.2, 0.3])
    same_std = convert_uncertainties(std_uncert, StdDevUncertainty)
    
    np.testing.assert_array_equal(same_std.array, std_uncert.array)
    print("✓ Identity conversion works")

if __name__ == "__main__":
    print("Testing convert_uncertainties helper function...")
    
    test_std_to_var()
    test_var_to_invvar()
    test_invvar_to_std()
    test_with_units()
    test_chained_conversion()
    test_identity_conversion()
    
    print("\nAll tests passed! ✓")
    print("\nThe convert_uncertainties function provides an easy way to convert")
    print("between different uncertainty types, as requested in the issue.")