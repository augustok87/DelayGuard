import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, useSessionStorage } from '../../../src/hooks/useLocalStorage';

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('initial-value');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
  });

  it('should return stored value when localStorage has data', () => {
    mockLocalStorage.getItem.mockReturnValue('"stored-value"');

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('stored-value');
  });

  it('should handle complex objects', () => {
    const complexObject = { id: 1, name: 'Test', items: [1, 2, 3] };
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(complexObject));

    const { result } = renderHook(() => useLocalStorage('test-key', {}));

    expect(result.current[0]).toEqual(complexObject);
  });

  it('should handle arrays', () => {
    const array = [1, 2, 3, 'test'];
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(array));

    const { result } = renderHook(() => useLocalStorage('test-key', []));

    expect(result.current[0]).toEqual(array);
  });

  it('should handle numbers', () => {
    mockLocalStorage.getItem.mockReturnValue('42');

    const { result } = renderHook(() => useLocalStorage('test-key', 0));

    expect(result.current[0]).toBe(42);
  });

  it('should handle booleans', () => {
    mockLocalStorage.getItem.mockReturnValue('true');

    const { result } = renderHook(() => useLocalStorage('test-key', false));

    expect(result.current[0]).toBe(true);
  });

  it('should handle null values', () => {
    mockLocalStorage.getItem.mockReturnValue('null');

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    expect(result.current[0]).toBeNull();
  });

  it('should handle undefined values', () => {
    mockLocalStorage.getItem.mockReturnValue('undefined');

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

    // When localStorage contains 'undefined' string, JSON.parse returns undefined
    // but the hook should return the initialValue when the parsed value is falsy
    expect(result.current[0]).toBe('default');
  });

  it('should set value in localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', '"new-value"');
    expect(result.current[0]).toBe('new-value');
  });

  it('should handle function updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0));

    act(() => {
      result.current[1](prev => prev + 1);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', '1');
    expect(result.current[0]).toBe(1);
  });

  it('should handle complex object updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', { count: 0 }));

    act(() => {
      result.current[1]({ count: 1, name: 'test' } as any);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', '{"count":1,"name":"test"}');
    expect(result.current[0]).toEqual({ count: 1, name: 'test' });
  });

  it('should remove value from localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[2]();
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
    expect(result.current[0]).toBe('initial');
  });

  it('should handle localStorage errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));

    expect(result.current[0]).toBe('fallback');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error reading localStorage key "test-key":',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should handle setItem errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('setItem error');
    });

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error setting localStorage key "test-key":',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should handle removeItem errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockLocalStorage.removeItem.mockImplementation(() => {
      throw new Error('removeItem error');
    });

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[2]();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error removing localStorage key "test-key":',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should handle invalid JSON in localStorage', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockLocalStorage.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));

    expect(result.current[0]).toBe('fallback');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error reading localStorage key "test-key":',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should handle empty string in localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('');

    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));

    expect(result.current[0]).toBe('fallback');
  });

  it('should handle special characters in key', () => {
    const { result } = renderHook(() => useLocalStorage('test-key-with-special-chars!@#$%', 'value'));

    expect(result.current[0]).toBe('value');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key-with-special-chars!@#$%');
  });

  it('should handle very large values', () => {
    const largeValue = 'x'.repeat(10000);
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(largeValue));

    const { result } = renderHook(() => useLocalStorage('test-key', ''));

    expect(result.current[0]).toBe(largeValue);
  });

  it('should handle nested objects', () => {
    const nestedObject = {
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    };
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(nestedObject));

    const { result } = renderHook(() => useLocalStorage('test-key', {}));

    expect(result.current[0]).toEqual(nestedObject);
  });

  it('should handle circular references gracefully', () => {
    const circularObject: any = { name: 'test' };
    circularObject.self = circularObject;

    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));

    act(() => {
      result.current[1](circularObject);
    });

    // Should handle circular reference gracefully - setItem should NOT be called
    // because JSON.stringify will throw an error for circular references
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    // But the state should still be updated
    expect(result.current[0]).toBe(circularObject);
  });
});

describe('useSessionStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  it('should return initial value when sessionStorage is empty', () => {
    const { result } = renderHook(() => useSessionStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('initial-value');
    expect(mockSessionStorage.getItem).toHaveBeenCalledWith('test-key');
  });

  it('should return stored value when sessionStorage has data', () => {
    mockSessionStorage.getItem.mockReturnValue('"stored-value"');

    const { result } = renderHook(() => useSessionStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('stored-value');
  });

  it('should set value in sessionStorage', () => {
    const { result } = renderHook(() => useSessionStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('test-key', '"new-value"');
    expect(result.current[0]).toBe('new-value');
  });

  it('should handle function updates', () => {
    const { result } = renderHook(() => useSessionStorage('test-key', 0));

    act(() => {
      result.current[1](prev => prev + 1);
    });

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('test-key', '1');
    expect(result.current[0]).toBe(1);
  });

  it('should remove value from sessionStorage', () => {
    const { result } = renderHook(() => useSessionStorage('test-key', 'initial'));

    act(() => {
      result.current[2]();
    });

    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('test-key');
    expect(result.current[0]).toBe('initial');
  });

  it('should handle sessionStorage errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockSessionStorage.getItem.mockImplementation(() => {
      throw new Error('sessionStorage error');
    });

    const { result } = renderHook(() => useSessionStorage('test-key', 'fallback'));

    expect(result.current[0]).toBe('fallback');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error reading sessionStorage key "test-key":',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should handle setItem errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockSessionStorage.setItem.mockImplementation(() => {
      throw new Error('setItem error');
    });

    const { result } = renderHook(() => useSessionStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error setting sessionStorage key "test-key":',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should handle removeItem errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockSessionStorage.removeItem.mockImplementation(() => {
      throw new Error('removeItem error');
    });

    const { result } = renderHook(() => useSessionStorage('test-key', 'initial'));

    act(() => {
      result.current[2]();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error removing sessionStorage key "test-key":',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should handle complex objects', () => {
    const complexObject = { id: 1, name: 'Test', items: [1, 2, 3] };
    mockSessionStorage.getItem.mockReturnValue(JSON.stringify(complexObject));

    const { result } = renderHook(() => useSessionStorage('test-key', {}));

    expect(result.current[0]).toEqual(complexObject);
  });

  it('should handle arrays', () => {
    const array = [1, 2, 3, 'test'];
    mockSessionStorage.getItem.mockReturnValue(JSON.stringify(array));

    const { result } = renderHook(() => useSessionStorage('test-key', []));

    expect(result.current[0]).toEqual(array);
  });

  it('should handle numbers', () => {
    mockSessionStorage.getItem.mockReturnValue('42');

    const { result } = renderHook(() => useSessionStorage('test-key', 0));

    expect(result.current[0]).toBe(42);
  });

  it('should handle booleans', () => {
    mockSessionStorage.getItem.mockReturnValue('true');

    const { result } = renderHook(() => useSessionStorage('test-key', false));

    expect(result.current[0]).toBe(true);
  });

  it('should handle null values', () => {
    mockSessionStorage.getItem.mockReturnValue('null');

    const { result } = renderHook(() => useSessionStorage('test-key', 'default'));

    expect(result.current[0]).toBeNull();
  });

  it('should handle undefined values', () => {
    mockSessionStorage.getItem.mockReturnValue('undefined');

    const { result } = renderHook(() => useSessionStorage('test-key', 'default'));

    // When sessionStorage contains 'undefined' string, JSON.parse returns undefined
    // but the hook should return the initialValue when the parsed value is falsy
    expect(result.current[0]).toBe('default');
  });
});
