import sys
sys.path.insert(0, '/Users/christopherdavid/code/commander/temp_astropy')

# Just check the logic conditions
mask = [[0, 1, 64], [8, 0, 1], [2, 1, 0]]

# Case 1: self has mask, operand exists but has no mask
self_mask = mask
operand = type('obj', (object,), {'mask': None})()

# Check conditions
print("self.mask is None:", self_mask is None)
print("operand is not None:", operand is not None) 
print("operand.mask is None:", operand.mask is None)
print("getattr(operand, 'mask', None) is None:", getattr(operand, 'mask', None) is None)

# Which branch would be taken in _arithmetic_mask?
if (self_mask is None and operand is not None and operand.mask is None):
    print("Branch 1: return None")
elif self_mask is None and operand is not None:
    print("Branch 2: return deepcopy(operand.mask)")
elif operand is None or getattr(operand, "mask", None) is None:
    print("Branch 3: return deepcopy(self.mask)")
else:
    print("Branch 4: return handle_mask(self.mask, operand.mask)")