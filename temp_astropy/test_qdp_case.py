#!/usr/bin/env python
"""Test case for QDP case sensitivity issue"""

import sys
sys.path.insert(0, './astropy')

from astropy.table import Table
import tempfile
import os

# Test 1: lowercase read serr command
qdp_content_lower = """read serr 1 2
1 0.5 1 0.5
"""

# Test 2: uppercase READ SERR command (should work)
qdp_content_upper = """READ SERR 1 2
1 0.5 1 0.5
"""

# Test 3: mixed case
qdp_content_mixed = """Read Serr 1 2
1 0.5 1 0.5
"""

def test_qdp_case(content, description):
    print(f"\n{description}:")
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.qdp', delete=False) as f:
            f.write(content)
            f.flush()
            fname = f.name
        
        table = Table.read(fname, format='ascii.qdp')
        print(f"  SUCCESS: {len(table)} rows, {len(table.colnames)} columns")
        print(f"  Columns: {table.colnames}")
    except Exception as e:
        print(f"  FAILED: {str(e)}")
    finally:
        if 'fname' in locals():
            os.unlink(fname)

# Run tests
test_qdp_case(qdp_content_lower, "Test 1: lowercase 'read serr'")
test_qdp_case(qdp_content_upper, "Test 2: uppercase 'READ SERR'")
test_qdp_case(qdp_content_mixed, "Test 3: mixed case 'Read Serr'")