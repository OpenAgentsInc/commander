import "@testing-library/jest-dom";

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = String(value);
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    key: (index: number): string | null => Object.keys(store)[index] || null,
    get length(): number {
      return Object.keys(store).length;
    },
  };
};

Object.defineProperty(window, "localStorage", {
  value: createStorageMock(),
  writable: true, // Allow re-assignment if needed by other test setups
});

Object.defineProperty(window, "sessionStorage", {
  value: createStorageMock(),
  writable: true,
});
