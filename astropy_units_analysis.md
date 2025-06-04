# Astropy Units Analysis: array_equal Issue

## Problem Statement
Using `np.array_equal()` on `astropy.units.Quantity` instances with incompatible units raises a `UnitConversionError`, but it should return `False` instead.

## Error Traceback Analysis
```python
>>> np.array_equal([1, 2, 3] * u.mm, [1, 2, 3] * u.s)

Traceback (most recent call last):
  File "astropy/units/quantity_helper/function_helpers.py", line 566, in array_equal
    args, unit = _quantities2arrays(a1, a2)
  File "astropy/units/quantity_helper/function_helpers.py", line 351, in _quantities2arrays
    arrays = tuple((q._to_own_unit(arg)) for arg in args)
  File "astropy/units/quantity.py", line 1652, in _to_own_unit
    _value = value.to_value(unit)
  File "astropy/units/quantity.py", line 983, in to_value
    value = self._to_value(unit, equivalencies)
  File "astropy/units/core.py", line 1054, in _apply_equivalencies
    raise UnitConversionError(f"{unit_str} and {other_str} are not convertible")
astropy.units.core.UnitConversionError: 's' (time) and 'mm' (length) are not convertible
```

## Current Implementation
The current implementation in `astropy/units/quantity_helper/function_helpers.py`:

```python
@function_helper
def array_equal(a1, a2, equal_nan=False):
    args, unit = _quantities2arrays(a1, a2)  # This raises UnitConversionError
    return args, dict(equal_nan=equal_nan), None, None

@function_helper
def array_equiv(a1, a2):
    args, unit = _quantities2arrays(a1, a2)  # This raises UnitConversionError
    return args, {}, None, None
```

## Root Cause
1. `_quantities2arrays()` function tries to convert all quantities to a common unit
2. When units are incompatible (like 'mm' and 's'), it raises `UnitConversionError`
3. This error propagates up and is not caught

## Expected Behavior
`np.array_equal()` should return `False` when comparing arrays with incompatible units, similar to how `1*u.m == 1*u.s` returns `False`.

## Solution Pattern
The fix involves:

1. **Change decorator**: From `@function_helper` to `@dispatched_function`
2. **Add exception handling**: Wrap `_quantities2arrays()` in try-except
3. **Return early**: Return `False` when `UnitConversionError` is caught
4. **Call numpy directly**: When units are compatible, call the numpy function directly

## Fixed Implementation
```python
@dispatched_function
def array_equal(a1, a2, equal_nan=False):
    try:
        args, unit = _quantities2arrays(a1, a2)
    except UnitConversionError:
        return False, None, None
    return np.array_equal(*args, equal_nan=equal_nan), None, None

@dispatched_function
def array_equiv(a1, a2):
    try:
        args, unit = _quantities2arrays(a1, a2)
    except UnitConversionError:
        return False, None, None
    return np.array_equiv(*args), None, None
```

## Key Files to Examine
1. `astropy/units/quantity_helper/function_helpers.py` - Contains the `array_equal` and `array_equiv` implementations
2. `astropy/units/core.py` - Contains `UnitConversionError` exception class
3. `astropy/units/tests/test_quantity_non_ufuncs.py` - Contains test cases

## Tests to Add
```python
def test_array_equal_incompatible_units(self):
    assert not np.array_equal([1, 2] * u.m, [1, 2] * u.s)

def test_array_equiv_incompatible_units(self):
    assert not np.array_equiv([1, 1] * u.m, [1] * u.s)
```

## Import Requirements
The fix requires importing `UnitConversionError`:
```python
from astropy.units.core import (
    UnitConversionError,
    UnitsError,
    UnitTypeError,
    dimensionless_unscaled,
)
```