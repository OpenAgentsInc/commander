import numpy as np
from astropy.utils.masked import Masked

# Create a structured array with a mask
dt = np.dtype([('a', 'i4'), ('b', 'f8')])
data = np.array([(1, 2.5), (3, 4.5)], dtype=dt)
mask = np.array([False, True], dtype=bool)

# Create a masked structured array
ma = Masked(data, mask=mask)

# Try to get string representation of a masked scalar
try:
    # This should fail with the current implementation
    result = np.array_str(ma[1])
    print(f"Success: {result}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

# Also test with array2string
try:
    result = np.array2string(ma[1])
    print(f"array2string Success: {result}")
except Exception as e:
    print(f"array2string Error: {type(e).__name__}: {e}")