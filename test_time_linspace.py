#!/usr/bin/env python
from astropy.time import Time
import numpy as np

# Test np.linspace with Time objects
t0 = Time('2021-01-01')
t1 = Time('2022-01-01')

try:
    times = np.linspace(t0, t1, num=50)
    print(f"Success! Created {len(times)} time points")
    print(f"First time: {times[0].iso}")
    print(f"Last time: {times[-1].iso}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Error type: {type(e)}")