#!/usr/bin/env python
"""Test script to verify HTML table formatting works with the patch."""

from astropy.table import Table
from io import StringIO

# generate table
t = Table([(1.23875234858e-24, 3.2348748432e-15), (2, 4)], names=('a', 'b'))
tc = t.copy()  # copy table

# print HTML table with "a" column formatted to show 2 decimal places
print("HTML output with formatting:")
with StringIO() as sp:
    tc.write(sp, format="html", formats={"a": lambda x: f"{x:.2e}"})
    html_output = sp.getvalue()
    print(html_output)

# Check if formatting was applied
if "1.24e-24" in html_output and "3.23e-15" in html_output:
    print("\n✓ SUCCESS: Formatting was applied correctly!")
else:
    print("\n✗ FAILURE: Formatting was not applied.")
    
# Also test with string format (not lambda)
print("\n\nHTML output with string format:")
with StringIO() as sp:
    tc.write(sp, format="html", formats={"a": ".2e"})
    html_output2 = sp.getvalue()
    print(html_output2)

# Compare with CSV output
print("\n\nCSV output for comparison:")
with StringIO() as sp:
    tc.write(sp, format="csv", formats={"a": ".2e"})
    print(sp.getvalue())