#!/usr/bin/env python

import sys
sys.path.insert(0, '/Users/christopherdavid/code/commander/temp_astropy')

import numpy as np
from astropy.nddata import NDDataRef

# Create test data
array = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]])
mask = np.array([[0, 1, 64], [8, 0, 1], [2, 1, 0]])

nref_nomask = NDDataRef(array)
nref_mask = NDDataRef(array, mask=mask)

print("Testing mask propagation issue...")

# Test case 1: multiply mask by constant (mask * no mask)
try:
    result = nref_mask.multiply(1., handle_mask=np.bitwise_or)
    print("Test 1 passed - mask:", result.mask)
except Exception as e:
    print("Test 1 failed:", type(e).__name__, str(e))

# Test case 2: multiply mask by no mask (mask * no mask)  
try:
    result = nref_mask.multiply(nref_nomask, handle_mask=np.bitwise_or)
    print("Test 2 passed - mask:", result.mask)
except Exception as e:
    print("Test 2 failed:", type(e).__name__, str(e))

# Check what happens in _arithmetic_mask
print("\nDebugging _arithmetic_mask behavior...")
from astropy.nddata.mixins.ndarithmetic import NDArithmeticMixin

# Create instance to test
test_obj = NDArithmeticMixin()
test_obj.mask = mask

# Test with operand that has no mask attribute
class NoMaskOperand:
    def __init__(self):
        self.data = array
        self.mask = None
        
operand_nomask = NoMaskOperand()

# What does _arithmetic_mask return?
try:
    result_mask = test_obj._arithmetic_mask(np.multiply, operand_nomask, np.bitwise_or)
    print("_arithmetic_mask with no-mask operand:", result_mask)
except Exception as e:
    print("_arithmetic_mask failed:", type(e).__name__, str(e))