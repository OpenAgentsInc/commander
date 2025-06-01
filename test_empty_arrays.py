#!/usr/bin/env python
"""Test empty array handling in WCS transformations"""

import numpy as np

# Simulate the current behavior
def current_return_list_of_arrays(axes, func):
    """Current implementation that fails"""
    if any(x.size == 0 for x in axes):
        return axes
    
    # This is where it would normally process non-empty arrays
    axes = np.broadcast_arrays(*axes)
    xy = np.hstack([x.reshape((x.size, 1)) for x in axes])
    output = func(xy)
    return [output[:, i].reshape(axes[0].shape) for i in range(output.shape[1])]

# Test with empty arrays
empty_arrays = [np.array([]), np.array([])]
print("Input empty arrays:", empty_arrays)
print("Current output:", current_return_list_of_arrays(empty_arrays, lambda x: x))

# Expected behavior - should return empty arrays with correct shape
def fixed_return_list_of_arrays(axes, func, naxis):
    """Fixed implementation"""
    if any(x.size == 0 for x in axes):
        # Return empty arrays with the correct number of output dimensions
        # For WCS transformations, this is typically naxis (same as input)
        empty_shape = axes[0].shape
        return [np.empty(empty_shape) for _ in range(naxis)]
    
    # Normal processing for non-empty arrays
    axes = np.broadcast_arrays(*axes)
    xy = np.hstack([x.reshape((x.size, 1)) for x in axes])
    output = func(xy)
    return [output[:, i].reshape(axes[0].shape) for i in range(output.shape[1])]

print("\nFixed output:", fixed_return_list_of_arrays(empty_arrays, lambda x: x, 2))