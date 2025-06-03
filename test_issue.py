import io
import numpy as np
from astropy.table import Table, Column

# Create a structured column with a field name of 'name'
dtype = np.dtype([('z', 'f8'), ('name', 'f8'), ('y', 'i4')])
t = Table()
t['c'] = Column([(1, 2, 3), (4, 5, 6)], dtype=dtype)

# Serialize to ECSV
out = io.StringIO()
t.write(out, format='ascii.ecsv')
print("Serialized ECSV:")
print(out.getvalue())

# Try to read back - this should fail with the error
try:
    t2 = Table.read(out.getvalue(), format='ascii.ecsv')
    print("Success!")
except TypeError as e:
    print(f"Error: {e}")