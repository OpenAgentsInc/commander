class TestObj:
    def __init__(self):
        self.mask = None

obj = TestObj()
print("obj.mask:", obj.mask)
print("getattr(obj, 'mask', None):", getattr(obj, 'mask', None))
print("getattr(obj, 'mask', None) is None:", getattr(obj, 'mask', None) is None)
print("hasattr(obj, 'mask'):", hasattr(obj, 'mask'))