#!/bin/bash
# Test Django username validator baseline

WORK_DIR="/tmp/django-baseline-test"
mkdir -p "$WORK_DIR"

# Create test script
cat > "$WORK_DIR/test_validators.py" << 'EOF'
import sys
sys.path.insert(0, '/opt/swe-bench/repo')

from django.contrib.auth.validators import UnicodeUsernameValidator, ASCIIUsernameValidator
from django.core.exceptions import ValidationError

print('Testing Django Username Validators')
print('=' * 40)

# Test current behavior
validators = [
    ('UnicodeUsernameValidator', UnicodeUsernameValidator()),
    ('ASCIIUsernameValidator', ASCIIUsernameValidator())
]

test_cases = [
    ('user', 'Should pass'),
    ('user123', 'Should pass'),
    ('user@test', 'Should pass'),
    ('user\n', 'Should FAIL (trailing newline)'),
    ('user\r\n', 'Should FAIL (trailing CRLF)'),
    ('\nuser', 'Should FAIL (leading newline)'),
]

for val_name, validator in validators:
    print(f'\n{val_name}:')
    print(f'Regex pattern: {validator.regex}')
    print('-' * 30)
    
    for username, description in test_cases:
        try:
            validator(username)
            result = '✅ PASSED'
        except ValidationError:
            result = '❌ FAILED'
        print(f'{repr(username):15} {result} - {description}')

# Show the actual regex issue
print('\n\nRegex Analysis:')
print('Current regex uses $ which matches before a newline')
print('Should use \\Z which only matches at the end of string')

# Let's also check the test file
print('\n\nChecking test file location:')
import os
test_file = 'tests/auth_tests/test_validators.py'
if os.path.exists(test_file):
    print(f'Found: {test_file}')
    with open(test_file, 'r') as f:
        lines = f.readlines()
        for i, line in enumerate(lines[235:245], 236):
            print(f'{i}: {line}', end='')
else:
    print(f'Not found: {test_file}')
EOF

# Run the test
echo "🐳 Running Django baseline test..."
docker run --rm -v "$WORK_DIR:/workspace" \
    -w /opt/swe-bench/repo \
    "swebench-manual-django__django-11099" \
    python /workspace/test_validators.py

echo ""
echo "🧹 Cleanup: rm -rf $WORK_DIR"