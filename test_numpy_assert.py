#!/usr/bin/env python3
"""Test numpy.testing.assert_equal behavior with nan."""

import numpy as np

# Test how numpy.testing.assert_equal handles nan
print("Testing numpy.testing.assert_equal with nan:")

try:
    np.testing.assert_equal(np.nan, np.nan)
    print("nan == nan: PASS")
except AssertionError as e:
    print(f"nan == nan: FAIL - {e}")

try:
    np.testing.assert_equal((1.0, np.nan), (1.0, np.nan))
    print("(1.0, nan) == (1.0, nan): PASS")
except AssertionError as e:
    print(f"(1.0, nan) == (1.0, nan): FAIL - {e}")

try:
    np.testing.assert_equal((1.0, np.nan), (1.0, -9.9792015476736e+291))
    print("(1.0, nan) == (1.0, -9.979...e+291): PASS")
except AssertionError as e:
    print(f"(1.0, nan) == (1.0, -9.979...e+291): FAIL - {e}")

# This is the actual failing case from the error message
try:
    np.testing.assert_equal(
        (1.4887146273078366e+308, np.nan),
        (1.4887146273078366e+308, -9.9792015476736e+291)
    )
    print("Original failing case: PASS")
except AssertionError as e:
    print(f"Original failing case: FAIL")
    print(f"Error: {e}")