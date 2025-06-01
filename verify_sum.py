#!/usr/bin/env python3
# Minimal test to verify Sum(1, (n, a, b)) behavior

# Let's check the eval_sum function directly
def eval_sum(f, limits):
    """Simplified version of eval_sum to verify logic"""
    (i, a, b) = limits
    
    # Mock free_symbols check - for constant 1, i is not in free symbols
    if "i" not in str(f):  # Simplified check
        if isinstance(a, str) or isinstance(b, str):
            return f"f*(b - a + 1) = {f}*(b - a + 1)"
        else:
            return f"f*(b - a + 1) = {f}*({b} - {a} + 1) = {f*(b - a + 1)}"
    return None

# Test cases
print("Test 1: Sum(1, (i, a, b))")
result = eval_sum(1, ('i', 'a', 'b'))
print(f"Result: {result}")

print("\nTest 2: Sum(1, (i, 2, 5))")
result = eval_sum(1, ('i', 2, 5))
print(f"Result: {result}")

print("\nExpected behavior: Sum(1, (n, a, b)) should return b - a + 1")
print("This is already implemented in sympy/concrete/summations.py at line 1021")