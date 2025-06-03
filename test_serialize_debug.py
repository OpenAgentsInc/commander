from astropy.table.serialize import SerializedColumn

# Test what happens with nested SerializedColumn
val = SerializedColumn({'name': SerializedColumn({'name': 'c.name'})})
print(f"val = {val}")
print(f"'name' in val = {'name' in val}")
print(f"val['name'] = {val['name']}")
print(f"type(val['name']) = {type(val['name'])}")
print(f"isinstance(val['name'], str) = {isinstance(val['name'], str)}")

# This should trigger the error
try:
    data_attrs_map = {}
    data_attrs_map[val['name']] = 'test'
except TypeError as e:
    print(f"\nError as expected: {e}")